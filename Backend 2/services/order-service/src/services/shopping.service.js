const Cart = require('../models/cart.model');
const Order = require('../models/order.model');
const couponService = require('./coupon.service');
const { resolveCatalogItems, getUserAddresses } = require('./catalog.service');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });
    return cart;
};

const getShoppingItemsFromCart = (cart) => cart.items.filter((item) => item.flowType === 'shopping');

const applyResolvedSnapshot = (cartItem, resolvedItem) => {
    cartItem.productId = resolvedItem.product_id;
    cartItem.productName = resolvedItem.product_name;
    cartItem.productSlug = resolvedItem.product_slug;
    cartItem.thumbnail = resolvedItem.thumbnail;
    cartItem.sku = resolvedItem.sku || '';
    cartItem.flowType = 'shopping';
    cartItem.variantId =
        resolvedItem.variant_index !== null && resolvedItem.variant_index !== undefined
            ? String(resolvedItem.variant_index)
            : '';
    cartItem.variantIndex = resolvedItem.variant_index;
    cartItem.variantSnapshot = resolvedItem.variant;
    cartItem.mrp = resolvedItem.mrp;
    cartItem.salePrice = resolvedItem.sale_price;
    cartItem.badge = resolvedItem.badge || '';
    cartItem.freeShipping = Boolean(resolvedItem.free_shipping);
    cartItem.quantity = resolvedItem.qty;
    cartItem.unitPrice = resolvedItem.unit_price;
    cartItem.totalPrice = resolvedItem.total_price;
};

const formatCartResponse = async (cart, { persist = false } = {}) => {
    const shoppingItems = getShoppingItemsFromCart(cart);

    if (!shoppingItems.length) {
        return {
            _id: cart._id,
            user_id: cart.userId,
            items: [],
            subtotal: 0,
            created_at: cart.createdAt,
            updated_at: cart.updatedAt,
        };
    }

    const resolvedItems = await resolveCatalogItems(
        'shopping',
        shoppingItems.map((item) => ({
            item_id: item._id.toString(),
            product_id: item.productId,
            variant_index: item.variantIndex ?? null,
            qty: item.quantity,
        })),
        false
    );

    const resolvedByItemId = new Map(
        resolvedItems.map((resolvedItem) => [String(resolvedItem.item_id), resolvedItem])
    );

    const responseItems = shoppingItems
        .map((item) => {
            const resolvedItem = resolvedByItemId.get(item._id.toString());
            if (!resolvedItem) return null;

            if (persist) applyResolvedSnapshot(item, resolvedItem);

            return {
                item_id: item._id,
                product_id: resolvedItem.product_id,
                name: resolvedItem.product_name,
                slug: resolvedItem.product_slug,
                thumbnail: resolvedItem.thumbnail,
                sku: resolvedItem.sku,
                mrp: resolvedItem.mrp,
                sale_price: resolvedItem.sale_price,
                discount_pct: resolvedItem.discount_pct,
                badge: resolvedItem.badge,
                qty: resolvedItem.qty,
                unit_price: resolvedItem.unit_price,
                total_price: resolvedItem.total_price,
                variant_index: resolvedItem.variant_index,
                variant: resolvedItem.variant,
                in_stock: resolvedItem.in_stock,
                available_stock: resolvedItem.available_stock,
                free_shipping: resolvedItem.free_shipping,
                category: resolvedItem.category,
                subcategory: resolvedItem.subcategory,
            };
        })
        .filter(Boolean);

    const subtotal = responseItems.reduce((sum, item) => sum + item.total_price, 0);

    if (persist) {
        await cart.save();
    }

    return {
        _id: cart._id,
        user_id: cart.userId,
        items: responseItems,
        subtotal,
        created_at: cart.createdAt,
        updated_at: cart.updatedAt,
    };
};

const addToCart = async (userId, { product_id, variant_index = null, qty }) => {
    const cart = await getOrCreateCart(userId);
    const existingItem = cart.items.find(
        (item) =>
            item.flowType === 'shopping' &&
            item.productId === product_id &&
            (item.variantIndex ?? null) === (variant_index ?? null)
    );

    const targetQty = (existingItem?.quantity || 0) + qty;
    const [resolvedItem] = await resolveCatalogItems(
        'shopping',
        [
            {
                product_id,
                variant_index,
                qty: targetQty,
            },
        ],
        true
    );

    if (existingItem) {
        applyResolvedSnapshot(existingItem, resolvedItem);
    } else {
        const cartItem = {
            productId: resolvedItem.product_id,
            productName: resolvedItem.product_name,
            productSlug: resolvedItem.product_slug,
            thumbnail: resolvedItem.thumbnail,
            sku: resolvedItem.sku,
            flowType: 'shopping',
            variantId:
                resolvedItem.variant_index !== null && resolvedItem.variant_index !== undefined
                    ? String(resolvedItem.variant_index)
                    : '',
            variantIndex: resolvedItem.variant_index,
            variantSnapshot: resolvedItem.variant,
            mrp: resolvedItem.mrp,
            salePrice: resolvedItem.sale_price,
            badge: resolvedItem.badge || '',
            freeShipping: Boolean(resolvedItem.free_shipping),
            quantity: resolvedItem.qty,
            unitPrice: resolvedItem.unit_price,
            totalPrice: resolvedItem.total_price,
        };

        cart.items.push(cartItem);
    }

    await cart.save();
    return formatCartResponse(cart, { persist: false });
};

const getCart = async (userId) => {
    const cart = await getOrCreateCart(userId);
    return formatCartResponse(cart, { persist: true });
};

const removeCartItem = async (userId, itemId) => {
    const cart = await getOrCreateCart(userId);
    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();
    return formatCartResponse(cart, { persist: false });
};

const createOrder = async (userId, { cart_id, address_id, coupon_code }) => {
    const cart = await Cart.findOne({ _id: cart_id, userId });
    if (!cart) throw createError('Cart not found', 404);

    const shoppingItems = getShoppingItemsFromCart(cart);
    if (!shoppingItems.length) throw createError('Shopping cart is empty', 400);

    const resolvedItems = await resolveCatalogItems(
        'shopping',
        shoppingItems.map((item) => ({
            item_id: item._id.toString(),
            product_id: item.productId,
            variant_index: item.variantIndex ?? null,
            qty: item.quantity,
        })),
        true
    );

    const addresses = await getUserAddresses(userId);
    const address = addresses.find((item) => String(item._id) === address_id);
    if (!address) throw createError('Address not found', 404);

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.total_price, 0);
    let discount = 0;
    let normalizedCoupon = '';

    if (coupon_code) {
        const coupon = await couponService.applyCoupon(userId, {
            code: coupon_code,
            subtotal,
            flowType: 'shopping',
        });

        discount = coupon.discount;
        normalizedCoupon = coupon.couponCode;
    }

    const deliveryCharge = resolvedItems.every((item) => item.free_shipping) ? 0 : 0;
    const total = subtotal - discount + deliveryCharge;

    const order = await Order.create({
        userId,
        items: resolvedItems.map((item) => ({
            productId: item.product_id,
            productName: item.product_name,
            productSlug: item.product_slug,
            sku: item.sku,
            thumbnail: item.thumbnail,
            variantId:
                item.variant_index !== null && item.variant_index !== undefined
                    ? String(item.variant_index)
                    : '',
            variantIndex: item.variant_index,
            variantSnapshot: item.variant,
            flowType: 'shopping',
            mrp: item.mrp,
            salePrice: item.sale_price,
            badge: item.badge || '',
            quantity: item.qty,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
        })),
        shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2 || '',
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country || 'India',
            ...(address.location ? { location: address.location } : {}),
        },
        subtotal,
        discount,
        deliveryCharge,
        total,
        couponCode: normalizedCoupon,
        timeline: [{ status: 'pending', note: 'Shopping order placed' }],
    });

    cart.items = cart.items.filter((item) => item.flowType !== 'shopping');
    await cart.save();

    return order;
};

module.exports = {
    addToCart,
    getCart,
    removeCartItem,
    createOrder,
};
