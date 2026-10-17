import * as migration_20261017_194916_initial from './20261017_194916_initial';
import * as migration_20261017_203432_public_name_snapshots from './20261017_203432_public_name_snapshots';

export const migrations = [
  {
    up: migration_20261017_194916_initial.up,
    down: migration_20261017_194916_initial.down,
    name: '20261017_194916_initial',
  },
  {
    up: migration_20261017_203432_public_name_snapshots.up,
    down: migration_20261017_203432_public_name_snapshots.down,
    name: '20261017_203432_public_name_snapshots'
  },
];
