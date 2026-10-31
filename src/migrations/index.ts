import * as migration_20261017_194916_initial from './20261017_194916_initial';
import * as migration_20261017_203432_public_name_snapshots from './20261017_203432_public_name_snapshots';
import * as migration_20261018_172043_media_storage_prefix from './20261018_172043_media_storage_prefix';
import * as migration_20261019_044019_media_approved from './20261019_044019_media_approved';
import * as migration_20261019_161832_user_display_name from './20261019_161832_user_display_name';
import * as migration_20261023_200200_city_guide_sections from './20261023_200200_city_guide_sections';
import * as migration_20261023_210000_more_day_trips from './20261023_210000_more_day_trips';
import * as migration_20261026_072341_rural_pages from './20261026_072341_rural_pages';
import * as migration_20261026_080000_rural_content from './20261026_080000_rural_content';
import * as migration_20261027_000000_fill_content from './20261027_000000_fill_content';
import * as migration_20261027_010000_publish_first_visit from './20261027_010000_publish_first_visit';
import * as migration_20261027_020000_ministry_stays from './20261027_020000_ministry_stays';
import * as migration_20261027_072915_map_coordinates from './20261027_072915_map_coordinates';
import * as migration_20261028_072300_site_social_profiles from './20261028_072300_site_social_profiles';
import * as migration_20261028_072400_indexnow_log from './20261028_072400_indexnow_log';
import * as migration_20261029_063705_venue_classes from './20261029_063705_venue_classes';
import * as migration_20261029_064438_guides_bookings_videos from './20261029_064438_guides_bookings_videos';
import * as migration_20261029_120000_city_videos from './20261029_120000_city_videos';
import * as migration_20261031_090000_first_visit_refresh from './20261031_090000_first_visit_refresh';

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
    name: '20261019_161832_user_display_name',
  },
  {
    up: migration_20261023_200200_city_guide_sections.up,
    down: migration_20261023_200200_city_guide_sections.down,
    name: '20261023_200200_city_guide_sections',
  },
  {
    up: migration_20261023_210000_more_day_trips.up,
    down: migration_20261023_210000_more_day_trips.down,
    name: '20261023_210000_more_day_trips',
  },
  {
    up: migration_20261026_072341_rural_pages.up,
    down: migration_20261026_072341_rural_pages.down,
    name: '20261026_072341_rural_pages',
  },
  {
    up: migration_20261026_080000_rural_content.up,
    down: migration_20261026_080000_rural_content.down,
    name: '20261026_080000_rural_content',
  },
  {
    up: migration_20261027_000000_fill_content.up,
    down: migration_20261027_000000_fill_content.down,
    name: '20261027_000000_fill_content',
  },
  {
    up: migration_20261027_010000_publish_first_visit.up,
    down: migration_20261027_010000_publish_first_visit.down,
    name: '20261027_010000_publish_first_visit',
  },
  {
    up: migration_20261027_020000_ministry_stays.up,
    down: migration_20261027_020000_ministry_stays.down,
    name: '20261027_020000_ministry_stays',
  },
  {
    up: migration_20261027_072915_map_coordinates.up,
    down: migration_20261027_072915_map_coordinates.down,
    name: '20261027_072915_map_coordinates',
  },
  {
    up: migration_20261028_072300_site_social_profiles.up,
    down: migration_20261028_072300_site_social_profiles.down,
    name: '20261028_072300_site_social_profiles',
  },
  {
    up: migration_20261028_072400_indexnow_log.up,
    down: migration_20261028_072400_indexnow_log.down,
    name: '20261028_072400_indexnow_log',
  },
  {
    up: migration_20261029_063705_venue_classes.up,
    down: migration_20261029_063705_venue_classes.down,
    name: '20261029_063705_venue_classes',
  },
  {
    up: migration_20261029_064438_guides_bookings_videos.up,
    down: migration_20261029_064438_guides_bookings_videos.down,
    name: '20261029_064438_guides_bookings_videos'
  },
  {
    up: migration_20261029_120000_city_videos.up,
    down: migration_20261029_120000_city_videos.down,
    name: '20261029_120000_city_videos',
  },
  {
    up: migration_20261031_090000_first_visit_refresh.up,
    down: migration_20261031_090000_first_visit_refresh.down,
    name: '20261031_090000_first_visit_refresh',
  },
];
