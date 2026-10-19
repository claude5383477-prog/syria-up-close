import * as migration_20261017_194916_initial from './20261017_194916_initial';
import * as migration_20261017_203432_public_name_snapshots from './20261017_203432_public_name_snapshots';
import * as migration_20261018_172043_media_storage_prefix from './20261018_172043_media_storage_prefix';
import * as migration_20261019_044019_media_approved from './20261019_044019_media_approved';
import * as migration_20261019_161832_user_display_name from './20261019_161832_user_display_name';

export const migrations = [
  {
    up: migration_20261017_194916_initial.up,
    down: migration_20261017_194916_initial.down,
    name: '20261017_194916_initial',
  },
  {
    up: migration_20261017_203432_public_name_snapshots.up,
    down: migration_20261017_203432_public_name_snapshots.down,
    name: '20261017_203432_public_name_snapshots',
  },
  {
    up: migration_20261018_172043_media_storage_prefix.up,
    down: migration_20261018_172043_media_storage_prefix.down,
    name: '20261018_172043_media_storage_prefix',
  },
  {
    up: migration_20261019_044019_media_approved.up,
    down: migration_20261019_044019_media_approved.down,
    name: '20261019_044019_media_approved',
  },
  {
    up: migration_20261019_161832_user_display_name.up,
    down: migration_20261019_161832_user_display_name.down,
    name: '20261019_161832_user_display_name'
  },
];
