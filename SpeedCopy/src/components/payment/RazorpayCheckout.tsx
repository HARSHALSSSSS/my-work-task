import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface RazorpayOptions {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface Props {
  visible: boolean;
  options: RazorpayOptions | null;
  onSuccess: (r: RazorpaySuccess) => void;
  onDismiss: (reason?: string) => void;
}

function buildHtml(o: RazorpayOptions): string {
  const safe = (v: any) => (v == null ? '' : String(v).replace(/'/g, "\\'"));
  const amountPaise = Math.round(o.amount * 100);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>html,body{margin:0;padding:0;background:#0b0b0b;color:#fff;font-family:sans-serif;}#s{display:flex;align-items:center;justify-content:center;height:100vh;font-size:14px;}</style>
</head>
<body>
  <div id="s">Opening secure checkout…</div>
  <script>
    function post(msg){ try{ window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }catch(e){} }
    document.addEventListener('DOMContentLoaded', function(){
      try {
        var rzp = new Razorpay({
          key: '${safe(o.keyId)}',
          amount: ${amountPaise},
          currency: '${safe(o.currency || 'INR')}',
          order_id: '${safe(o.orderId)}',
          name: '${safe(o.name || 'SpeedCopy')}',
          description: '${safe(o.description || 'Order payment')}',
          prefill: {
            name: '${safe(o.prefill?.name)}',
            email: '${safe(o.prefill?.email)}',
            contact: '${safe(o.prefill?.contact)}'
          },
          theme: { color: '${safe(o.theme?.color || '#0F766E')}' },
          handler: function (response) { post({ type: 'success', response: response }); },
          modal: { ondismiss: function(){ post({ type: 'dismiss', reason: 'user_cancelled' }); } }
        });
        rzp.on('payment.failed', function (resp) { post({ type: 'failed', error: resp.error }); });
        rzp.open();
      } catch (e) {
        post({ type: 'error', message: e && e.message ? e.message : 'Init failed' });
      }
    });
  </script>
</body>
</html>`;
}

export function RazorpayCheckout({ visible, options, onSuccess, onDismiss }: Props) {
  const html = useMemo(() => (options ? buildHtml(options) : ''), [options]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success' && data.response) {
        onSuccess({
          razorpay_order_id: data.response.razorpay_order_id,
          razorpay_payment_id: data.response.razorpay_payment_id,
          razorpay_signature: data.response.razorpay_signature,
        });
      } else if (data.type === 'dismiss') {
        onDismiss(data.reason || 'dismissed');
      } else if (data.type === 'failed') {
        onDismiss(data.error?.description || 'Payment failed');
      } else if (data.type === 'error') {
        onDismiss(data.message || 'Checkout error');
      }
    } catch {
      onDismiss('Invalid response');
    }
  };

  if (!visible || !options) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={() => onDismiss('back_button')}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Secure Checkout</Text>
          <TouchableOpacity onPress={() => onDismiss('closed')} hitSlop={10}>
            <Text style={styles.headerClose}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={["*"]}
          source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#0F766E" />
            </View>
          )}
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0b0b0b',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerClose: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: '#0b0b0b' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0b' },
});
