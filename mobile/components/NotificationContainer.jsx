import { View } from 'react-native';
import { useNotification } from '../store/notificationStore';
import NotificationDisplay from './NotificationDisplay';

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <View style={{ position: 'absolute', top: 60, left: 0, right: 0, zIndex: 9999 }}>
      {notifications.map((notification) => (
        <NotificationDisplay
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </View>
  );
}
