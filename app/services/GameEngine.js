const { GameMap, Tile, Wall, DeployedAmmunition, Ammunition, Group, AttackWave, sequelize } = require('../models');
const { Op } = require('sequelize');

class GameEngine {
    constructor(mapId, io) {
        this.mapId = mapId;
        this.io = io;
        this.attackReport = [];
    }

    log(message) {
        const logEntry = { time: new Date().toISOString(), message };
        this.attackReport.push(logEntry);
        console.log(`[GameEngine MapID: ${this.mapId}] ${message}`);
        // Optionally emit detailed logs to a specific admin room if needed for real-time monitoring
        // this.io.to('admins').emit('game-engine-log', { mapId: this.mapId, log: logEntry });
    }

    async getExternalWalls() {
        this.log("شناسایی دیوارهای خارجی...");
        const tilesWithOwners = await Tile.findAll({
            where: { MapId: this.mapId, OwnerGroupId: { [Op.ne]: null } },
            include: [
                { model: Wall, as: 'walls', required: true,
                  include: [{model: DeployedAmmunition, as: 'deployedAmmunitions', include: [{model: Ammunition, as: 'ammunitionDetail'}]}] // Preload ammo for damage calculation
                },
                { model: Group, as: 'ownerGroup', attributes: ['id', 'name'] }
            ],
            order: [[sequelize.col('walls.id'), 'ASC']] // Consistent order
        });

        const map = await GameMap.findByPk(this.mapId);
        if (!map) throw new Error("نقشه برای شناسایی دیوارهای خارجی یافت نشد.");
        const mapSize = map.size;

        const externalWalls = [];

        for (const tile of tilesWithOwners) {
            for (const wall of tile.walls) {
                let isExternal = false;
                let adjacentX = tile.x;
                let adjacentY = tile.y;

                if (wall.direction === 'north') adjacentY--;
                else if (wall.direction === 'south') adjacentY++;
                else if (wall.direction === 'east') adjacentX++;
                else if (wall.direction === 'west') adjacentX--;

                if (adjacentX < 0 || adjacentX >= mapSize || adjacentY < 0 || adjacentY >= mapSize) {
                    isExternal = true;
                } else {
                const adjacentTile = await Tile.findOne({ // کاشی همسایه را با تمام فیلدهایش، از جمله isDestroyed، بخوان
                        where: { MapId: this.mapId, x: adjacentX, y: adjacentY }
                    });

                // شرط جدید: دیوار خارجی است اگر کاشی همسایه وجود نداشته باشد (بعید) یا نابود شده باشد
                if (!adjacentTile) { // این حالت نباید در یک نقشه سالم رخ دهد
                    this.log(`هشدار: کاشی همسایه در موقعیت (${adjacentX},${adjacentY}) برای کاشی (${tile.x},${tile.y}) یافت نشد.`);
                    isExternal = true; // به عنوان خارجی در نظر گرفته شود برای ایمنی
                } else if (adjacentTile.isDestroyed) {
                    this.log(`کاشی همسایه (${adjacentX},${adjacentY}) برای دیوار ${wall.direction} از کاشی (${tile.x},${tile.y}) نابود شده است. دیوار خارجی است.`);
                        isExternal = true;
                } else {
                    // کاشی همسایه وجود دارد و نابود نشده است (چه مالک داشته باشد چه نداشته باشد)
                    // پس دیوار فعلی، داخلی است نسبت به این همسایه.
                    this.log(`کاشی همسایه (${adjacentX},${adjacentY}) برای دیوار ${wall.direction} از کاشی (${tile.x},${tile.y}) سالم است (isDestroyed=false). دیوار داخلی است.`);
                    isExternal = false;
                    }
                }

                if (isExternal) {
                const ownerGroupName = tile.ownerGroup ? tile.ownerGroup.name : (tile.OwnerGroupId === null ? "بدون مالک" : "مالک نامشخص");
                    externalWalls.push({ wall, tile }); // wall instance now includes its deployedAmmunitions
                this.log(`دیوار خارجی شناسایی شد: Tile (${tile.x},${tile.y}), Wall ID ${wall.id} (${wall.direction}), Owner: ${ownerGroupName}`);
                }
            }
        }
    if (externalWalls.length === 0) {
        this.log("هیچ دیوار خارجی فعالی در این موج حمله شناسایی نشد.");
    } else {
        this.log(`تعداد ${externalWalls.length} دیوار خارجی شناسایی شد.`);
    }
        return externalWalls;
    }

    async applyDamageToTargets(totalAttackPower, targets) {
        this.log(`اعمال قدرت حمله ${totalAttackPower} به هر یک از ${targets.length} دیوار هدف خارجی.`);
        if (!targets.length) {
            this.log("هیچ دیوار خارجی برای اعمال آسیب یافت نشد.");
            return;
        }

        // دیگر قدرت حمله تقسیم نمی‌شود. هر دیوار خارجی کل قدرت حمله را دریافت می‌کند.
        // متغیر remainingPowerOverall نیز دیگر لازم نیست چون قدرت کلی برای هر دیوار مستقل است.

        for (const { wall, tile: ownerTile } of targets) {
            // اگر دیوار یا کاشی مالک آن به دلایلی در این فاصله از بین رفته باشد (بسیار بعید در یک اجرای تک نخی)
            // می‌توان یک بررسی اضافی در اینجا انجام داد، اما فعلاً فرض بر صحت داده‌های ورودی است.

            const attackPowerForThisSpecificWall = totalAttackPower; // هر دیوار کل قدرت حمله را دریافت می‌کند.

            this.log(`[DMG_TRACE] شروع پردازش دیوار ID ${wall.id} (کاشی ${ownerTile.x},${ownerTile.y}). قدرت حمله موج: ${totalAttackPower}. سلامت اولیه دیوار: ${wall.health}.`);

            let remainingAttackPowerOnWall = attackPowerForThisSpecificWall;

            // Log مهمات قبل از آسیب
            if (wall.deployedAmmunitions && wall.deployedAmmunitions.length > 0) {
                this.log(`[DMG_TRACE] دیوار ID ${wall.id} دارای ${wall.deployedAmmunitions.length} مهمات است.`);
                for(const ammo of wall.deployedAmmunitions) {
                    this.log(`[DMG_TRACE]   مهمات ID ${ammo.id} (${ammo.ammunitionDetail.name}) - سلامت اولیه: ${ammo.health}, خط دفاعی: ${ammo.ammunitionDetail.defenseLine}`);
                }
            } else {
                this.log(`[DMG_TRACE] دیوار ID ${wall.id} مهمات ندارد.`);
            }

            // Sort ammos by defenseLine DESC on the preloaded ammos
            const sortedAmmos = [...wall.deployedAmmunitions].sort((a, b) => b.ammunitionDetail.defenseLine - a.ammunitionDetail.defenseLine);

            for (const ammo of sortedAmmos) {
                if (remainingAttackPowerOnWall <= 0) {
                    this.log(`[DMG_TRACE] قدرت حمله برای دیوار ID ${wall.id} تمام شد (قبل از مهمات ID ${ammo.id}).`);
                    break;
                }
                if (ammo.health <= 0) {
                    this.log(`[DMG_TRACE] مهمات ID ${ammo.id} روی دیوار ${wall.id} از قبل نابود شده بود.`);
                    continue;
                }

                const damageToAmmo = Math.min(remainingAttackPowerOnWall, ammo.health);
                this.log(`[DMG_TRACE] دیوار ID ${wall.id}, مهمات ID ${ammo.id}: قدرت حمله باقیمانده ${remainingAttackPowerOnWall}, سلامت مهمات ${ammo.health}. آسیب محاسبه شده به مهمات: ${damageToAmmo}.`);
                ammo.health -= damageToAmmo;
                remainingAttackPowerOnWall -= damageToAmmo;
                this.log(`[DMG_TRACE] مهمات ID ${ammo.id} (${ammo.ammunitionDetail.name}) روی دیوار ID ${wall.id} آسیب دید: ${damageToAmmo}. سلامت نهایی مهمات: ${ammo.health}. قدرت حمله باقیمانده برای دیوار: ${remainingAttackPowerOnWall}`);

                await ammo.save();
            }

            wall.changed('deployedAmmunitions', true); // Mark as changed if Sequelize doesn't detect nested changes for emit

            if (remainingAttackPowerOnWall > 0 && wall.health > 0) {
                const damageToWall = Math.min(remainingAttackPowerOnWall, wall.health);
                this.log(`[DMG_TRACE] دیوار ID ${wall.id}: قدرت حمله باقیمانده ${remainingAttackPowerOnWall}, سلامت دیوار ${wall.health}. آسیب محاسبه شده به دیوار: ${damageToWall}.`);
                wall.health -= damageToWall;
                this.log(`[DMG_TRACE] دیوار ID ${wall.id} آسیب دید: ${damageToWall}. سلامت نهایی دیوار: ${wall.health}.`);
                await wall.save();

                if (wall.health <= 0) {
                    this.log(`[DMG_TRACE] دیوار ID ${wall.id} نابود شد (سلامت نهایی: ${wall.health}). کاشی (${ownerTile.x},${ownerTile.y}) اکنون نابود شده تلقی می‌شود.`);
                    const previousOwnerId = ownerTile.OwnerGroupId;

                    ownerTile.OwnerGroupId = null; // چه مالک داشته چه نداشته، دیگر مالک ندارد
                    ownerTile.isDestroyed = true; // علامت‌گذاری به عنوان نابود شده
                    // ownerTile.price = 0; // یا هر مقدار دیگری که نشان‌دهنده عدم قابلیت خرید باشد (اختیاری، isDestroyed مهمتر است)
                    await ownerTile.save();

                    // حذف تمام مهمات روی تمام دیوارهای این کاشی (دیوارها در مرحله بعد حذف می‌شوند)
                    const allWallsOfTile = await Wall.findAll({where: {TileId: ownerTile.id}, attributes: ['id']});
                    const allWallIdsOfTile = allWallsOfTile.map(w => w.id);
                    if (allWallIdsOfTile.length > 0) {
                        await DeployedAmmunition.destroy({ where: { WallId: { [Op.in]: allWallIdsOfTile } } });
                    }
                    // حذف تمام دیوارهای این کاشی
                    await Wall.destroy({ where: { TileId: ownerTile.id } });
                    this.log(`تمام دیوارهای کاشی ID ${ownerTile.id} حذف شدند.`);

                    // ارسال ایونت به کلاینت که کاشی نابود شده است
                    this.io.emit('tile-destroyed', {
                        mapId: this.mapId,
                        tileId: ownerTile.id,
                        x: ownerTile.x,
                        y: ownerTile.y,
                        isDestroyed: true, // ارسال وضعیت جدید
                        ownerGroupId: null // ارسال وضعیت جدید مالکیت
                        // previousOwnerId: previousOwnerId // اگر لازم باشد کلاینت بداند مالک قبلی که بوده
                    });
                    this.log(`کاشی ID ${ownerTile.id} در (${ownerTile.x},${ownerTile.y}) نابود شد و وضعیت به کلاینت‌ها اعلام گردید.`);

                    // بررسی حذف گروه اگر این کاشی آخرین کاشی گروه بوده
                    if (previousOwnerId) { // فقط اگر قبلا مالک داشته
                        const remainingTiles = await Tile.count({
                            where: {
                                OwnerGroupId: previousOwnerId,
                                MapId: this.mapId,
                                isDestroyed: false // فقط کاشی‌های سالم و با مالکیت گروه را بشمار
                            }
                        });
                        if (remainingTiles === 0) {
                            const group = await Group.findByPk(previousOwnerId);
                            const groupName = group ? group.name : 'ناشناس';
                            this.log(`گروه ID ${previousOwnerId} (${groupName}) تمام املاک قابل استفاده خود را از دست داد.`);
                            this.io.emit('group-eliminated', { mapId: this.mapId, groupId: previousOwnerId, groupName: groupName });
                        }
                    }
                }
            }
            // دیگر نیازی به remainingPowerOverall نیست چون آسیب تقسیم نمی‌شود.
        }
        this.log("پردازش آسیب به دیوارها تکمیل شد.");
    }

    async cleanupDamagedAmmunition(targetedWallIds) {
        const damagedDeployedAmmos = await DeployedAmmunition.findAll({
            include: [{ model: Ammunition, as: 'ammunitionDetail', required: true, attributes: ['name', 'health'] }],
            where: {
                WallId: { [Op.in]: targetedWallIds },
                [Op.or]: [
                    { health: { [Op.lte]: 0 } },
                    sequelize.where(sequelize.col('DeployedAmmunition.health'), Op.lt, sequelize.col('ammunitionDetail.health'))
                ]
            },
            attributes: ['id', 'WallId']
        });

        if (damagedDeployedAmmos.length > 0) {
            this.log(`حذف ${damagedDeployedAmmos.length} مهمات آسیب دیده/نابود شده...`);
            for (const dAmmo of damagedDeployedAmmos) {
                 this.log(`حذف مهمات آسیب دیده ID ${dAmmo.id} (نوع: ${dAmmo.ammunitionDetail.name}) از دیوار ID ${dAmmo.WallId}.`);
            }
            await DeployedAmmunition.destroy({ where: { id: { [Op.in]: damagedDeployedAmmos.map(da => da.id) } } });
            this.log("حذف مهمات آسیب دیده تکمیل شد.");
        } else {
            this.log("هیچ مهمات آسیب دیده ای برای حذف یافت نشد.");
        }
    }


    async executeNextAttack() {
        this.attackReport = [];
        this.log("شروع اجرای موج حمله بعدی...");

        const transaction = await sequelize.transaction();
        try {
            const map = await GameMap.findByPk(this.mapId, { transaction });
            if (!map || !map.isActive) {
                await transaction.rollback();
                this.log("نقشه یافت نشد یا فعال نیست.");
                return { success: false, message: "نقشه یافت نشد یا فعال نیست.", report: this.attackReport };
            }

            const nextWave = await AttackWave.findOne({
                where: {
                    MapId: this.mapId,
                    isExecuted: false,
                    attackTime: { [Op.lte]: new Date() }
                },
                order: [['attackTime', 'ASC']],
                transaction
            });

            if (!nextWave) {
                await transaction.rollback();
                this.log("موج حمله بعدی برای اجرا یافت نشد.");
                return { success: false, message: "موج حمله بعدی برای اجرا یافت نشد.", report: this.attackReport };
            }

            this.log(`اجرای موج حمله ID: ${nextWave.id} با قدرت ${nextWave.power} در زمان ${nextWave.attackTime}`);

            const externalWallsDetails = await this.getExternalWalls(); // This is outside transaction for now, uses its own.
            if (externalWallsDetails.length > 0) {
                 await this.applyDamageToTargets(nextWave.power, externalWallsDetails);
                 await this.cleanupDamagedAmmunition(externalWallsDetails.map(ewd => ewd.wall.id));
            } else {
                this.log("هیچ دیوار خارجی برای حمله یافت نشد.");
            }

            nextWave.isExecuted = true;
            await nextWave.save({ transaction });
            this.log(`موج حمله ID: ${nextWave.id} به عنوان اجرا شده علامت‌گذاری شد.`);

            // منطق قفل دائمی نقشه پس از اولین حمله از اینجا حذف شد.
            // gameLocked اکنون برای قفل موقت قبل و حین حمله استفاده می‌شود.

            await transaction.commit(); // تغییرات موج حمله و آسیب‌ها ثبت می‌شوند.
            this.log("موج حمله با موفقیت اجرا و ثبت شد.");

            // پس از اجرای موفقیت آمیز حمله، نقشه را باز می کنیم.
            // این کار پس از transaction.commit انجام می‌شود تا اگر خطایی در بالا رخ داد، نقشه باز نشود.
            try {
                const currentMapState = await GameMap.findByPk(this.mapId);
                if (currentMapState && currentMapState.gameLocked) {
                    currentMapState.gameLocked = false;
                    await currentMapState.save(); // ذخیره در یک تراکنش جدید یا بدون تراکنش
                    this.log(`نقشه ID: ${this.mapId} پس از حمله باز شد.`);
                    this.io.emit('game-locked', { mapId: this.mapId, gameLocked: false });
                }
            } catch (unlockError) {
                console.error(`[GameEngine MapID: ${this.mapId}] Error unlocking map after attack:`, unlockError);
                this.log(`خطا در باز کردن نقشه پس از حمله: ${unlockError.message}`);
                // حتی اگر باز کردن نقشه با خطا مواجه شود، نتیجه اصلی حمله موفقیت آمیز بوده است.
            }

            const updatedMapData = await require('../controllers/GameController').getFullMapState(this.mapId);
            if(updatedMapData) this.io.emit('map-updated', { map: updatedMapData });

            return { success: true, wave: nextWave.toJSON(), report: this.attackReport };

        } catch (error) {
            await transaction.rollback(); // Rollback a تراکنش اصلی در صورت خطا در اجرای حمله
            console.error(`[GameEngine MapID: ${this.mapId}] Error executing attack wave:`, error);
            this.log(`خطا در اجرای موج حمله: ${error.message} ${error.stack}`);
            // در صورت خطا، ممکن است بخواهیم نقشه را باز کنیم اگر قبلاً قفل شده بود،
            // اما این بستگی به منطق قفل کردن در مراحل بالاتر (زمانبند یا کنترلر دستی) دارد.
            // فعلاً، اگر حمله با خطا مواجه شود، وضعیت قفل نقشه بدون تغییر باقی می‌ماند.
            return { success: false, message: `خطا در اجرای موج حمله: ${error.message}`, report: this.attackReport };
        }
    }

    static attackSchedulerInterval = null;
    static ioInstance = null;
    static PRE_ATTACK_LOCK_WINDOW_MS = 30 * 1000; // 30 ثانیه
    static SCHEDULER_INTERVAL_MS = 10 * 1000; // 10 ثانیه

    static startAttackScheduler(io) {
        GameEngine.ioInstance = io;
        if (GameEngine.attackSchedulerInterval) {
            console.log("[GameEngine Scheduler] زمان‌بند در حال اجرا است.");
            return;
        }
        console.log(`[GameEngine Scheduler] شروع به کار زمان‌بند (هر ${GameEngine.SCHEDULER_INTERVAL_MS / 1000} ثانیه)...`);
        GameEngine.attackSchedulerInterval = setInterval(async () => {
            if (!GameEngine.ioInstance) {
                console.error("[GameEngine Scheduler] نمونه IO برای زمان‌بند در دسترس نیست.");
                return;
            }
            // console.log("[GameEngine Scheduler] تیک: بررسی حملات در انتظار...");
            const activeMaps = await GameMap.findAll({ where: { isActive: true } });
            const now = new Date();

            for (const map of activeMaps) {
                try {
                    // 1. اجرای امواجی که زمانشان فرا رسیده است
                    const dueAttackWaves = await AttackWave.findAll({
                        where: {
                            MapId: map.id,
                            isExecuted: false,
                            attackTime: { [Op.lte]: now }
                        },
                        order: [['attackTime', 'ASC']] // اجرای قدیمی‌ترین‌ها اول
                    });

                    for (const wave of dueAttackWaves) {
                        // اگر نقشه هنوز قفل نشده (مثلا توسط منطق پیش قفل)، آن را قبل از حمله قفل کن
                        if (!map.gameLocked) {
                            map.gameLocked = true;
                            await map.save();
                            GameEngine.ioInstance.emit('game-locked', { mapId: map.id, gameLocked: true });
                            console.log(`[GameEngine Scheduler] نقشه ID ${map.id} بلافاصله قبل از اجرای حمله ID ${wave.id} قفل شد.`);
                        }

                        console.log(`[GameEngine Scheduler] ${dueAttackWaves.length} موج حمله موعد رسیده برای نقشه ${map.id} (${map.name}) یافت شد. اجرای موج ID: ${wave.id}`);
                        const engine = new GameEngine(map.id, GameEngine.ioInstance);
                        await engine.executeNextAttack(); // این متد خودش نقشه را پس از حمله باز می‌کند
                        // پس از باز شدن نقشه توسط executeNextAttack، وضعیت map.gameLocked باید بروز شود
                        // برای بررسی در حلقه بعدی یا برای منطق پیش-قفل.
                        const updatedMap = await GameMap.findByPk(map.id);
                        if (updatedMap) {
                            map.gameLocked = updatedMap.gameLocked; // بروزرسانی وضعیت قفل نقشه
                        }
                    }

                    // 2. بررسی و قفل کردن نقشه‌ها برای امواجی که به زودی اجرا می‌شوند
                    if (!map.gameLocked) { // فقط اگر نقشه در حال حاضر باز است، برای قفل پیش از موعد بررسی کن
                        const upcomingAttackTimeLimit = new Date(now.getTime() + GameEngine.PRE_ATTACK_LOCK_WINDOW_MS);
                        const nextImminentWave = await AttackWave.findOne({
                            where: {
                                MapId: map.id,
                                isExecuted: false,
                                attackTime: {
                                    [Op.gt]: now, // زمان حمله هنوز نرسیده
                                    [Op.lte]: upcomingAttackTimeLimit // اما در پنجره ۳۰ ثانیه‌ای ما قرار دارد
                                }
                            },
                            order: [['attackTime', 'ASC']]
                        });

                        if (nextImminentWave) {
                            console.log(`[GameEngine Scheduler] موج حمله ID ${nextImminentWave.id} برای نقشه ${map.id} در ${GameEngine.PRE_ATTACK_LOCK_WINDOW_MS / 1000} ثانیه آینده شناسایی شد. قفل کردن نقشه.`);
                            map.gameLocked = true;
                            await map.save();
                            GameEngine.ioInstance.emit('game-locked', { mapId: map.id, gameLocked: true });
                        }
                    }
                } catch (error) {
                    console.error(`[GameEngine Scheduler] خطا در پردازش نقشه ${map.id} (${map.name}):`, error);
                }
            }
        }, GameEngine.SCHEDULER_INTERVAL_MS);
    }

    static stopAttackScheduler(){
        if(GameEngine.attackSchedulerInterval){
            clearInterval(GameEngine.attackSchedulerInterval);
            GameEngine.attackSchedulerInterval = null;
            console.log("[GameEngine Scheduler] Attack scheduler stopped.");
        }
    }
}

module.exports = GameEngine;
