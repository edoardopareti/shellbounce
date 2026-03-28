// Tank Hitbox
export const TANK_RADIUS = 18;  // The radius of the tank's circular hitbox

// Tank base movement
export const TANK_MOVE_SPEED = 200;  // The forward movement speed of the tank in pixels per second
export const TANK_REVERSE_SPEED = 150; // The backward movement speed of the tank in pixels per second
export const TANK_ROTATION_SPEED = Math.PI * 1.8;  // The rotation speed of the tank in radians per second (1.8 * PI means 180 degrees in 1 second)

// Tank boost
export const TANK_BOOST_MULTIPLIER = 1.75; // The speed multiplier applied during a boost (1.75 means 75% faster than normal speed)
export const TANK_BOOST_DURATION_MS = 1400; // The duration of the boost effect in milliseconds (1400 ms means the boost lasts for 1.4 seconds)
export const TANK_BOOST_COOLDOWN_MS = 2600; // The cooldown time after using a boost before it can be used again, in milliseconds (2600 ms means you have to wait 2.6 seconds after boosting before you can boost again)

// Tank shield
export const TANK_SHIELD_RADIUS = 25; // The radius of the temporary shield activated while turning left and right simultaneously
export const TANK_SHIELD_FORWARD_OFFSET = 15; // Forward distance from tank center where the shield sector is anchored
export const TANK_SHIELD_SECTOR_ANGLE_RADIANS = Math.PI * 0.7; // Angular span of the shield sector centered on turret direction

// Tank bullet
export const BULLET_RADIUS = 5;  // The radius of the bullet's circular hitbox
export const BULLET_SPEED = 420;  // The speed of the bullet in pixels per second
export const BULLET_EXPLOSION_RADIUS = 84;  // The radius of the bullet's explosion
export const FIRE_COOLDOWN_MS = 100;  // The cooldown time between firing bullets in milliseconds

// Tank charged shot
export const CHARGED_SHOT_MAX_SPEED_MULTIPLIER = 2.5;  // The maximum speed multiplier for a charged shot
export const CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER = 1.5;  // The maximum explosion radius multiplier for a charged shot

// Tank mine
export const MINE_RADIUS = 10;  // The radius of the mine's circular hitbox
export const MINE_EXPLOSION_RADIUS = 118;  // The radius of the mine's explosion

// Game settings
export const MAX_ACTIVE_BULLETS_PER_TANK = 4;  // The maximum number of active bullets a tank can have at a time
export const BULLET_MAX_BOUNCES = 3;  // The maximum number of times a bullet can bounce off walls before it is destroyed
export const BULLET_LIFETIME_MS = 4000;  // The lifetime of a bullet in milliseconds
export const BULLET_EXPLOSION_VISUAL_DURATION_MS = 160;  // The duration of the bullet explosion visual effect in milliseconds
export const CHARGED_SHOT_MIN_HOLD_MS = 150;  // The minimum time required to hold the shot button for a charged shot
export const CHARGED_SHOT_MAX_HOLD_MS = 1200;  // The maximum time you can hold the shot button for a charged shot
export const CHARGED_SHOT_OVERCHARGE_MS = 2400;  // The time after which a charged shot overcharges
export const CHARGED_SHOT_COOLDOWN_MS = 2400;  // The cooldown time after firing a charged shot before it can be fired again
export const SHIELD_OVERCHARGE_MS = 2400; // The time after which shield overcharge self-destructs the tank if continuously held
export const SHIELD_COOLDOWN_MS = 2400; // The cooldown time after releasing or overcharging the shield before it can be activated again
export const MAX_ACTIVE_MINES_PER_TANK = 3;  // The maximum number of active mines a tank can have at a time
export const MINE_ARMING_DELAY_MS = 380;  // The delay before a mine becomes armed after being placed
export const MINE_LIFETIME_MS = 8000;  // The lifetime of a mine in milliseconds
export const MINE_EXPLOSION_VISUAL_DURATION_MS = 210;  // The duration of the mine explosion visual effect in milliseconds
export const MUZZLE_OFFSET = 26;  // The offset of the muzzle from the center of the tank
export const TANK_RESPAWN_DELAY_MS = 3000; // The delay before a tank respawns after being destroyed, in milliseconds
export const SPAWN_CORNER_PADDING = 56;  // The padding from the corners of the map where tanks can spawn, in pixels
export const SHOT_PREVIEW_REFLECTIONS = 1;  // The number of reflections to show in the shot preview
export const SHOT_PREVIEW_MAX_DISTANCE = 720;  // The maximum distance to show in the shot preview, in pixels
