import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { firebaseConfig } from '../../config/firebase';

export interface RecaptchaHandle {
  open: () => Promise<string>;
  close: () => void;
}

/**
 * Invisible reCAPTCHA rendered inside a WebView.
 * Resolves a reCAPTCHA token that Firebase phone auth requires.
 */
export const FirebaseRecaptcha = forwardRef<RecaptchaHandle>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);

  const close = useCallback(() => {
    setVisible(false);
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  useImperativeHandle(ref, () => ({
    open: () =>
      new Promise<string>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        setVisible(true);
      }),
    close,
  }));

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'recaptcha_token') {
          resolveRef.current?.(data.token);
          close();
        } else if (data.type === 'recaptcha_error') {
          rejectRef.current?.(new Error(data.message || 'reCAPTCHA failed'));
          close();
        }
      } catch {
        rejectRef.current?.(new Error('Invalid reCAPTCHA response'));
        close();
      }
    },
    [close],
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { background: transparent; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    #recaptcha-container { transform: scale(0.9); }
  </style>
</head>
<body>
  <div id="recaptcha-container"></div>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
  <script>
    try {
      firebase.initializeApp(${JSON.stringify(firebaseConfig)});
      var verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'normal',
        callback: function(token) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'recaptcha_token', token: token }));
        },
        'expired-callback': function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'recaptcha_error', message: 'reCAPTCHA expired' }));
        }
      });
      verifier.render();
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'recaptcha_error', message: e.message }));
    }
  </script>
</body>
</html>`;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <WebView
            source={{ html }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            onMessage={onMessage}
            originWhitelist={['*']}
          />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 320,
    height: 420,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
