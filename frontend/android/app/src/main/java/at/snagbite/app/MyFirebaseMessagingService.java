package at.snagbite.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "MyFcmService";
    private static final String CHANNEL_ID = "ai-suggestions";
    private static final int HTTP_TIMEOUT_MS = 10000;
    private static final int MAX_REDIRECTS = 3;

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "onNewToken triggered: " + token);
        PushNotificationsPlugin.onNewToken(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "onMessageReceived triggered: " + remoteMessage.getData());

        // Forward to Capacitor plugin so in-app listeners fire if app is open
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String title = data.get("title");
        String body = data.get("body");

        if (title == null && body == null) {
            if (remoteMessage.getNotification() != null) {
                title = remoteMessage.getNotification().getTitle();
                body = remoteMessage.getNotification().getBody();
            }
        }

        if (title == null && body == null) return;

        showNotification(title, body, data, remoteMessage);
    }

    private void showNotification(String title, String body, Map<String, String> data, RemoteMessage remoteMessage) {
        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Recipe suggestions",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Personalized recipe ideas from your cookbook");
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (data != null) {
            android.os.Bundle dataBundle = new android.os.Bundle();
            for (Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
                dataBundle.putString(entry.getKey(), entry.getValue());
            }
            intent.putExtra("data", dataBundle);
            intent.putExtra("pushNotificationData", dataBundle);
        }

        // Essential FCM identification extras required by Capacitor's PushNotificationsPlugin
        // to recognize the intent as a notification tap event and trigger pushNotificationActionPerformed
        String msgId = remoteMessage != null && remoteMessage.getMessageId() != null
                ? remoteMessage.getMessageId()
                : "msg_" + System.currentTimeMillis();
        intent.putExtra("google.message_id", msgId);
        intent.putExtra("message_id", msgId);
        intent.putExtra("google.sent_time", System.currentTimeMillis());

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        String iconUrl = data != null ? data.get("iconUrl") : null;
        if (iconUrl != null && !iconUrl.isEmpty()) {
            Bitmap iconBitmap = fetchBitmap(iconUrl);
            if (iconBitmap != null) {
                builder.setLargeIcon(iconBitmap);
            }
        }

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private Bitmap fetchBitmap(String src) {
        String currentUrl = src;
        int redirects = 0;

        while (redirects < MAX_REDIRECTS) {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(currentUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.setConnectTimeout(HTTP_TIMEOUT_MS);
                connection.setReadTimeout(HTTP_TIMEOUT_MS);
                connection.setInstanceFollowRedirects(true);
                connection.connect();

                int resCode = connection.getResponseCode();

                // Check for HTTP -> HTTPS or cross-protocol redirects
                if (resCode == HttpURLConnection.HTTP_MOVED_PERM ||
                    resCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                    resCode == HttpURLConnection.HTTP_SEE_OTHER ||
                    resCode == 307 || resCode == 308) {
                    String location = connection.getHeaderField("Location");
                    if (location != null && !location.isEmpty()) {
                        URL nextUrl = new URL(url, location);
                        currentUrl = nextUrl.toExternalForm();
                        redirects++;
                        connection.disconnect();
                        continue;
                    }
                }

                if (resCode != HttpURLConnection.HTTP_OK) {
                    Log.e(TAG, "HTTP " + resCode + " downloading image: " + currentUrl);
                    return null;
                }

                try (InputStream input = connection.getInputStream()) {
                    return BitmapFactory.decodeStream(input);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to download notification image (" + currentUrl + "): " + e.getMessage());
                return null;
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }
        Log.e(TAG, "Too many redirects downloading image: " + src);
        return null;
    }
}
