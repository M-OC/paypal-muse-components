/* globals describe beforeAll afterAll afterEach it expect jest */
/* @flow */
import { Tracker } from '../src/tracker-component';
import constants from '../src/lib/constants';
// $FlowFixMe
import generateIdModule from '../src/lib/generate-id';
import { getUserId, getCartId } from '../src/lib/local-storage-utils';

const { sevenDays, storage } = constants;

const decode = (encodedDataParam : string) : string => {
  return JSON.parse(atob(decodeURIComponent(encodedDataParam)));
};

const extractDataParam = (url : string) : string => {
  return decode(
    (url.match(/\?data=(.+)$/) || [
      '',
      encodeURIComponent(btoa(JSON.stringify({})))
    ])[1]
  );
};

const autoPropertyId = 'wow-so-auto';
let fetchCalls = [];

// $FlowFixMe
describe('paypal.Tracker', () => {
  let createElementCalls = 0;

  const propertyId = 'hello-there';
  window.fetch = (url, options) => {
    const body = options ? options.body : undefined;

    fetchCalls.push([ url, options ]);
    return Promise.resolve({
      url,
      body,
      status: 200,
      json: () => ({ id: autoPropertyId, hello: 'hi' })
    });
  };

  const deviceInfo = {
    screenWidth: '1000',
    screenHeight: '750',
    colorDepth: '300',
    deviceType: 'desktop',
    browserHeight: '400',
    browserWidth: '400'
  };

  const imgMock = {
    src: '',
    style: {},
    addEventListener: () => {
      /* empty */
    }
  };

  const createElement = (elementType : string) => {
    // $FlowFixMe
    createElementCalls++;
    expect(elementType).toBe('img');
    return imgMock;
  };

  // $FlowFixMe
  const originalDocumentCreateElement = document.createElement;
  const originalGenerateId = generateIdModule.generateId;
  beforeAll(() => {
    const deviceLib = require('../src/lib/get-device-info');
    // $FlowFixMe
    deviceLib.getDeviceInfo = () => deviceInfo;

    // $FlowFixMe
    document.createElement = createElement;
    // $FlowFixMe
    generateIdModule.generateId = () => 'abc123';
    // generateIdModule.set(() => 'abc123');
  });

  // $FlowFixMe
  afterAll(() => {
    // $FlowFixMe
    document.createElement = originalDocumentCreateElement;
    // $FlowFixMe
    generateIdModule.generateId = originalGenerateId;
  });

  beforeEach(() => {
    window.localStorage.removeItem(storage.paypalCrCart);
    window.localStorage.removeItem(storage.paypalCrUser);
  });

  // $FlowFixMe
  afterEach(() => {
    createElementCalls = 0;
    imgMock.src = '';
    window.localStorage.removeItem(storage.paypalCrCart);
    window.localStorage.removeItem(storage.paypalCrUser);
    document.cookie = 'paypal-cr-cart=;';
    fetchCalls = [];
  });

  // $FlowFixMe
  it('should be a function that returns a tracker', () => {
    const tracker = Tracker();
    expect(tracker).toHaveProperty('viewPage');
    expect(tracker).toHaveProperty('addToCart');
    expect(tracker).toHaveProperty('setCart');
    expect(tracker).toHaveProperty('removeFromCart');
    expect(tracker).toHaveProperty('purchase');
    expect(tracker).toHaveProperty('track');
    expect(tracker).toHaveProperty('getIdentity');
    expect(tracker).toHaveProperty('cancelCart');
  });

  it('should clear stored cart content if cart is expired', () => {
    const beforeStorage = window.localStorage.getItem(storage.paypalCrCart);
    const twoWeeksAgo = (Date.now() - (sevenDays * 2));
    
    expect(beforeStorage).toBe(null);
    window.localStorage.setItem(storage.paypalCrCart, JSON.stringify({
      cartId: 'arglebargleflimflam',
      createdAt: twoWeeksAgo
    }));

    // Since the expiry is in the past, this initialization should clear
    // the cart and expiry.
    Tracker();

    const afterStorage = JSON.parse(window.localStorage.getItem(storage.paypalCrCart));

    expect(afterStorage.cartId).not.toBe('arglebargleflimflam');
    expect(afterStorage.createdAt).toBeGreaterThan(twoWeeksAgo);
  });

  it('should send addToCart events', () => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    const tracker = Tracker({ currencyCode: 'FOO', user: { email, name: userName } });
    expect(createElementCalls).toBe(0);
    tracker.setPropertyId(propertyId);
    tracker.addToCart({
      cartId: '__test__cartId',
      items: [
        {
          title: 'archbishop of canterbury',
          imgUrl: 'animageurl',
          price: 'tree fiddy',
          id: '__test__productId',
          url: 'https://example.com/__test__productId'
        }
      ],
      emailCampaignId: '__test__emailCampaignId',
      cartTotal: '12345.67'
    });
    expect(JSON.stringify(extractDataParam(imgMock.src))).toBe(
      JSON.stringify({
        cartId: '__test__cartId',
        items: [
          {
            title: 'archbishop of canterbury',
            imgUrl: 'animageurl',
            price: 'tree fiddy',
            id: '__test__productId',
            url: 'https://example.com/__test__productId'
          }
        ],
        emailCampaignId: '__test__emailCampaignId',
        total: '12345.67',
        cartEventType: 'addToCart',
        currencyCode: 'FOO',
        user: {
          email: '__test__email3@gmail.com',
          name: '__test__userName3',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'cartEvent',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
    expect(createElementCalls).toBe(1);
    tracker.addToCart({
      cartId: '__test__cartId0',
      items: [
        {
          title: 'duke of lancaster',
          imgUrl: 'animageurl',
          price: 'tree fiddy',
          id: '__test__productId0',
          url: 'https://example.com/__test__productId0'
        }
      ],
      emailCampaignId: '__test__emailCampaignId0',
      cartTotal: '102345.67',
      currencyCode: 'USD'
    });
    expect(JSON.stringify(extractDataParam(imgMock.src))).toBe(
      JSON.stringify({
        cartId: '__test__cartId0',
        items: [
          {
            title: 'duke of lancaster',
            imgUrl: 'animageurl',
            price: 'tree fiddy',
            id: '__test__productId0',
            url: 'https://example.com/__test__productId0'
          }
        ],
        emailCampaignId: '__test__emailCampaignId0',
        currencyCode: 'USD',
        total: '102345.67',
        cartEventType: 'addToCart',
        user: {
          email: '__test__email3@gmail.com',
          name: '__test__userName3',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'cartEvent',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
  });

  it('should send setCart events', () => {
    const email = '__test__email4@gmail.com';
    const userName = '__test__userName4';
    const tracker = Tracker({ user: { email, name: userName } });
    tracker.setPropertyId(propertyId);
    expect(createElementCalls).toBe(0);
    tracker.addToCart({
      cartId: '__test__cartId0',
      items: [
        {
          title: 'sultan of cairo',
          imgUrl: 'animageurl',
          price: 'tree fiddy',
          id: '__test__productId0',
          url: 'https://example.com/__test__productId0'
        }
      ],
      emailCampaignId: '__test__emailCampaignId0',
      cartTotal: '102345.67',
      currencyCode: 'USD'
    });
    tracker.setCart({
      cartId: '__test__cartId',
      items: [
        {
          title: 'william of normandy',
          imgUrl: 'animageurl',
          price: 'tree fiddy',
          id: '__test__productId',
          url: 'https://example.com/__test__productId'
        }
      ],
      emailCampaignId: '__test__emailCampaignId',
      currencyCode: 'USD',
      total: '12345.67'
    });
    expect(JSON.stringify(extractDataParam(imgMock.src))).toBe(
      JSON.stringify({
        cartId: '__test__cartId',
        items: [
          {
            title: 'william of normandy',
            imgUrl: 'animageurl',
            price: 'tree fiddy',
            id: '__test__productId',
            url: 'https://example.com/__test__productId'
          }
        ],
        emailCampaignId: '__test__emailCampaignId',
        currencyCode: 'USD',
        total: '12345.67',
        cartEventType: 'setCart',
        user: {
          email: '__test__email4@gmail.com',
          name: '__test__userName4',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'cartEvent',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
    expect(createElementCalls).toBe(2);
  });

  it('should send removeFromCart events', () => {
    const email = '__test__email5@gmail.com';
    const userName = '__test__userName5';
    const tracker = Tracker({ user: { email, name: userName } });
    tracker.setPropertyId(propertyId);
    expect(createElementCalls).toBe(0);
    tracker.removeFromCart({
      currencyCode: 'LARGE_SHINY_ROCKS',
      cartId: '__test__cartId',
      cartTotal: '5.00',
      items: [
        {
          id: '__test__productId',
          url: 'https://example.com/__test__productId'
        }
      ]
    });

    expect(JSON.stringify(extractDataParam(imgMock.src))).toBe(
      JSON.stringify({
        currencyCode: 'LARGE_SHINY_ROCKS',
        cartId: '__test__cartId',
        items: [ {
          id: '__test__productId',
          url: 'https://example.com/__test__productId'
        } ],
        total: '5.00',
        cartEventType: 'removeFromCart',
        user: {
          email: '__test__email5@gmail.com',
          name: '__test__userName5',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'cartEvent',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
    expect(createElementCalls).toBe(1);
  });

  it('should send purchase events', () => {
    const email = '__test__email6@gmail.com';
    const userName = '__test__userName6';
    const tracker = Tracker({ currencyCode: 'COWRIESHELLS', user: { email, name: userName } });
    tracker.setPropertyId(propertyId);
    expect(createElementCalls).toBe(0);
    tracker.purchase({
      currencyCode: 'USD',
      cartId: '__test__cartId'
    });
    expect(JSON.stringify(extractDataParam(imgMock.src))).toBe(
      JSON.stringify({
        currencyCode: 'USD',
        cartId: '__test__cartId',
        user: {
          email: '__test__email6@gmail.com',
          name: '__test__userName6',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'purchase',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
    expect(createElementCalls).toBe(1);
  });

  it('should send cancelCart events and clear localStorage upon cancelling cart', () => {
    const email = '__test__email7@gmail.com';
    const userName = '__test__userName7';
    const tracker = Tracker({ currencyCode: 'COWRIESHELLS', user: { email, name: userName } });
    tracker.setPropertyId(propertyId);
    expect(createElementCalls).toBe(0);
    tracker.cancelCart();
    expect(JSON.stringify(extractDataParam(imgMock.src))).toBe(
      JSON.stringify({
        currencyCode: 'COWRIESHELLS',
        cartId: 'abc123',
        user: {
          email: '__test__email7@gmail.com',
          name: '__test__userName7',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'cancelCart',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
    expect(createElementCalls).toBe(1);

    const afterStorage = JSON.parse(window.localStorage.getItem(storage.paypalCrCart));

    expect(afterStorage.cartId).not.toBe('__test__cartId');
  });

  it('should call paramsToBeaconUrl to create the url if you pass in paramsToBeaconUrl function', () => {
    const userName = '__test__userName6';
    let calledArgs;
    const paramsToBeaconUrl = (...args) => {
      calledArgs = args;
      return 'https://example.com/picture';
    };
    const tracker = Tracker({
      user: { email: '__test__email@gmail.com', name: userName },
      paramsToBeaconUrl
    });
    tracker.setPropertyId(propertyId);
    expect(createElementCalls).toBe(0);
    tracker.purchase({
      cartId: '__test__cartId'
    });
    expect(imgMock.src).toBe('https://example.com/picture');
    expect(createElementCalls).toBe(1);
    expect(JSON.stringify(calledArgs)).toEqual(
      JSON.stringify([
        {
          trackingType: 'purchase',
          data: {
            cartId: '__test__cartId',
            currencyCode: 'USD',
            user: {
              email: '__test__email@gmail.com',
              name: '__test__userName6',
              id: 'abc123'
            },
            propertyId,
            trackingType: 'purchase',
            clientId: 'abcxyz123',
            merchantId: 'xyz,hij,lmno',
            deviceInfo,
            version: 'TRANSITION_FLAG'
          }
        }
      ])
    );
  });

  it('should set the user', () => {
    const userName = '__test__userName9';
    const email = '__test__email9';
    const tracker = Tracker();
    tracker.setPropertyId(propertyId);
    expect(createElementCalls).toBe(0);
    tracker.setUser({ user: { name: userName, email } });
    expect(createElementCalls).toBe(1);
    expect(JSON.stringify(extractDataParam(imgMock.src))).toBe(
      JSON.stringify({
        currencyCode: 'USD',
        cartId: 'abc123',
        user: {
          email: '__test__email9',
          name: '__test__userName9',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'setUser',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
  });

  it('should allow you to instantiate a user and then set the user', () => {
    const tracker = Tracker({
      user: {
        id: 'foo',
        email: '__test__oldEmail333@gmail.com'
      }
    });
    tracker.setPropertyId(propertyId);
    expect(createElementCalls).toBe(0);
    tracker.setUser({
      user: {
        id: 'bar',
        email: '__test__email@gmail.com',
        name: '__test__name'
      }
    });
    expect(createElementCalls).toBe(1);
    const dataParamObject = extractDataParam(imgMock.src);
    // $FlowFixMe
    expect(JSON.stringify(dataParamObject)).toBe(
      JSON.stringify({
        prevMerchantProvidedUserId: 'foo',
        currencyCode: 'USD',
        cartId: 'abc123',
        user: {
          merchantProvidedUserId: 'bar',
          email: '__test__email@gmail.com',
          name: '__test__name',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'setUser',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
  });

  it('should send last user set with setUser', () => {
    const tracker = Tracker();
    tracker.setPropertyId(propertyId);
    tracker.setUser({
      user: { email: '__test__email1', name: '__test__name1' }
    });
    tracker.setUser({ user: { email: '__test__email2' } });
    tracker.addToCart({
      cartId: '__test__cartId',
      items: [
        {
          title: 'duke of york',
          imgUrl: 'animageurl',
          price: 'tree fiddy',
          id: '__test__productId',
          url: 'https://example.com/__test__productId'
        }
      ],
      emailCampaignId: '__test__emailCampaignId',
      cartTotal: '12345.67',
      currencyCode: 'USD'
    });
    const dataParamObject = extractDataParam(imgMock.src);
    // $FlowFixMe
    expect(JSON.stringify(dataParamObject)).toBe(
      JSON.stringify({
        cartId: '__test__cartId',
        items: [
          {
            title: 'duke of york',
            imgUrl: 'animageurl',
            price: 'tree fiddy',
            id: '__test__productId',
            url: 'https://example.com/__test__productId'
          }
        ],
        emailCampaignId: '__test__emailCampaignId',
        currencyCode: 'USD',
        total: '12345.67',
        cartEventType: 'addToCart',
        user: {
          email: '__test__email2',
          name: '__test__name1',
          id: 'abc123'
        },
        propertyId,
        trackingType: 'cartEvent',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
  });

  it('should set the cartId when setCartId is called', () => {
    const tracker = Tracker();
    const beforeStorage = JSON.parse(window.localStorage.getItem(storage.paypalCrCart));
    tracker.setCartId('arglebargle');
    const afterStorage = JSON.parse(window.localStorage.getItem(storage.paypalCrCart));

    expect(beforeStorage).not.toEqual(afterStorage);
    expect(afterStorage.cartId).toBe('arglebargle');
  });

  it('should hit partner-token route when identify method is invoked', done => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    const tracker = Tracker({ user: { email, name: userName } });
    tracker.identify(data => {
      const params = fetchCalls.pop();
      expect(params[0]).toBe('https://paypal.com/muse/api/partner-token');
      expect(params[1].body).toBe(JSON.stringify({
        merchantId: 'xyz',
        clientId: 'abcxyz123'
      }));
      expect(data).toEqual({
        hello: 'hi',
        id: autoPropertyId,
        success: true
      });
      done();
    });
  });

  it('should hit partner-token route defined with paramsToTokenUrl when identify method is invoked', done => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    const tokenUrl = 'www.blah.xyz';
    const tracker = Tracker({
      user: { email, name: userName },
      paramsToTokenUrl: () => tokenUrl
    });
    tracker.identify(data => {
      const params = fetchCalls.pop();
      expect(params[0]).toBe(tokenUrl);
      expect(data).toEqual({
        hello: 'hi',
        id: autoPropertyId,
        success: true
      });
      done();
    });
  });

  it('should return promise from identify call', done => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    const tracker = Tracker({ user: { email, name: userName } });

    tracker.identify().then(data => {
      expect(data).toEqual({
        hello: 'hi',
        id: autoPropertyId,
        success: true
      });
      done();
    });
  });

  it('should call getIdentity function with url passed in', done => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    const tracker = Tracker({ user: { email, name: userName } });

    const data = {
      mrid: 'NA4JBW4FWCUQL',
      onIdentification: identityData => identityData
    };
    const url = 'https://www.paypal.com/muse/api/partner-token';
    const result = tracker.getIdentity(data, url).then(accessToken => {
      expect(result).toBeInstanceOf(Promise);
      expect(accessToken).toBeInstanceOf(Object);
      done();
    });
  });

  it('should call getIdentity function with no url passed in', done => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    const tracker = Tracker({ user: { email, name: userName } });

    const data = {
      mrid: 'NA4JBW4FWCUQL',
      onIdentification: identityData => identityData
    };
    const result = tracker.getIdentity(data).then(accessToken => {
      expect(accessToken).toBeInstanceOf(Object);
      expect(result).toBeInstanceOf(Promise);
      done();
    });
  });

  it('should not fetch implicit propertyId route if one is provided', () => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    const id = 'abc123';
    const tracker = Tracker({ user: {
      email,
      name: userName
    }, propertyId });
    // viewPage will have been called once at the time the tracker is itialized
    expect(createElementCalls).toBe(1);
    tracker.setPropertyId(propertyId);
    expect(fetchCalls.length).toBe(0);
    tracker.addToCart({
      cartId: '__test__cartId',
      items: [
        {
          title: 'consul of rome',
          imgUrl: 'animageurl',
          price: 'tree fiddy',
          id: '__test__productId',
          url: 'https://example.com/__test__productId'
        }
      ],
      emailCampaignId: '__test__emailCampaignId',
      cartTotal: '12345.67',
      currencyCode: 'USD'
    });
    expect(JSON.stringify(extractDataParam(imgMock.src))).toBe(
      JSON.stringify({
        cartId: '__test__cartId',
        items: [
          {
            title: 'consul of rome',
            imgUrl: 'animageurl',
            price: 'tree fiddy',
            id: '__test__productId',
            url: 'https://example.com/__test__productId'
          }
        ],
        emailCampaignId: '__test__emailCampaignId',
        currencyCode: 'USD',
        total: '12345.67',
        cartEventType: 'addToCart',
        user: { email, name: userName, id },
        propertyId,
        trackingType: 'cartEvent',
        clientId: 'abcxyz123',
        merchantId: 'xyz,hij,lmno',
        deviceInfo,
        version: 'TRANSITION_FLAG'
      })
    );
    expect(createElementCalls).toBe(2);
  });

  it('should not fetch implicit propertyId route if one is not provided and propertyid is cached', () => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';

    Tracker({ user: { email, name: userName } });
    expect(createElementCalls).toBe(0);
    expect(fetchCalls.length).toBe(0);
  });

  it('should fetch implicit propertyId route if one is not provided', () => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    // clear local storage to ensure a request happens
    window.localStorage.removeItem('property-id-abcxyz123-xyz');
    Tracker({ user: { email, name: userName } });

    expect(createElementCalls).toBe(0);
    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0][0]).toBe('https://www.paypal.com/tagmanager/containers/xo?mrid=xyz&url=http%3A%2F%2Flocalhost');
  });

  it('should not fetch propertyId if one is provided', () => {
    const email = '__test__email3@gmail.com';
    const userName = '__test__userName3';
    // clear local storage to ensure a request happens
    window.localStorage.removeItem('property-id-abcxyz123-xyz');

    Tracker({ user: { email, name: userName }, propertyId: 'hello' });
    expect(fetchCalls.length).toBe(0);
  });

  it('should gracefully fail in the event that malformed data exists in local storage', () => {
    // eslint-disable-next-line no-console
    console.error = jest.fn();
    window.localStorage.setItem(storage.paypalCrUser, 'this will cause an error');
    window.localStorage.setItem(storage.paypalCrCart, 'this will also cause an error');

    // eslint-disable-next-line no-console
    expect(console.error.mock.calls.length).toBe(0);
    Tracker();
    const userId = getUserId().userId;
    const cartId = getCartId().cartId;
    // eslint-disable-next-line no-console
    expect(console.error.mock.calls.length).toBe(1);
    expect(typeof userId).toBe('string');
    expect(typeof cartId).toBe('string');

    // eslint-disable-next-line no-console
    console.error.mockRestore();
  });
});
