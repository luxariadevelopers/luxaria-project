import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ALL_NOTIFICATION_EVENT_TYPES,
  getEventTypeLabel,
  type NotificationEventTypeCode,
} from './eventTypes';

export type NotificationFilterState = {
  unreadOnly: boolean;
  eventType: NotificationEventTypeCode | '';
};

type Props = {
  value: NotificationFilterState;
  onChange: (next: NotificationFilterState) => void;
};

export function NotificationFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        mb: 2,
        alignItems: { xs: 'stretch', sm: 'center' },
      }}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value.unreadOnly ? 'unread' : 'all'}
        onChange={(_e, next) => {
          if (next === null) {
            return;
          }
          onChange({ ...value, unreadOnly: next === 'unread' });
        }}
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="unread">Unread</ToggleButton>
      </ToggleButtonGroup>

      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="notification-event-filter">Event type</InputLabel>
        <Select
          labelId="notification-event-filter"
          label="Event type"
          value={value.eventType}
          onChange={(e) =>
            onChange({
              ...value,
              eventType: e.target.value as NotificationEventTypeCode | '',
            })
          }
        >
          <MenuItem value="">
            <em>All events</em>
          </MenuItem>
          {ALL_NOTIFICATION_EVENT_TYPES.map((eventType) => (
            <MenuItem key={eventType} value={eventType}>
              {getEventTypeLabel(eventType)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
