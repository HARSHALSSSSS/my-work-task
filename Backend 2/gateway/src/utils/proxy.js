const HOP_BY_HOP_HEADERS = [
  'connection',
  'proxy-connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
];

const buildProxyReqOptDecorator = (targetUrl, decorateHeaders) => {
  const targetHost = new URL(targetUrl).host;

  return (proxyReqOpts, srcReq) => {
    const headers = { ...(proxyReqOpts.headers || {}) };

    for (const header of HOP_BY_HOP_HEADERS) {
      delete headers[header];
      delete headers[header.toLowerCase()];
    }

    headers.host = targetHost;

    if (srcReq.method === 'GET' || srcReq.method === 'HEAD') {
      delete headers['content-length'];
      delete headers['Content-Length'];
    }

    if (typeof decorateHeaders === 'function') {
      decorateHeaders(headers, srcReq);
    }

    return {
      ...proxyReqOpts,
      headers,
    };
  };
};

const buildProxyReqBodyDecorator = () => (bodyContent, srcReq) => {
  const method = String(srcReq.method || '').toUpperCase();

  if (method === 'GET' || method === 'HEAD') {
    return '';
  }

  return bodyContent;
};

const decorateAuthHeaders = (headers, srcReq) => {
  if (srcReq.headers['x-user-id']) {
    headers['x-user-id'] = srcReq.headers['x-user-id'];
  }
  if (srcReq.headers['x-user-role']) {
    headers['x-user-role'] = srcReq.headers['x-user-role'];
  }
  if (srcReq.headers['x-user-email']) {
    headers['x-user-email'] = srcReq.headers['x-user-email'];
  }
  if (srcReq.headers['x-firebase-uid']) {
    headers['x-firebase-uid'] = srcReq.headers['x-firebase-uid'];
  }
  if (srcReq.headers['x-user-permissions']) {
    headers['x-user-permissions'] = srcReq.headers['x-user-permissions'];
  }
};

const buildAuthedProxyReqOptDecorator = (targetUrl, decorateHeaders) =>
  buildProxyReqOptDecorator(targetUrl, (headers, srcReq) => {
    decorateAuthHeaders(headers, srcReq);
    if (typeof decorateHeaders === 'function') {
      decorateHeaders(headers, srcReq);
    }
  });

module.exports = {
  buildProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  buildAuthedProxyReqOptDecorator,
};
