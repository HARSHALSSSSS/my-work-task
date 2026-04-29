const Referral = require('../models/referral.model');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');

const REFERRAL_REWARD = 50; // ₹50 reward on first order

const generateCode = (userId) => {
    const base = userId.toString().slice(-4).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `SC${base}${rand}`;
};

const getOrCreateReferral = async (userId) => {
    let referral = await Referral.findOne({ referrerId: userId, referredId: { $exists: false } });
    if (!referral) {
        let code;
        let attempts = 0;
        do {
            code = generateCode(userId);
            attempts++;
        } while ((await Referral.exists({ referralCode: code })) && attempts < 5);

        referral = await Referral.create({ referrerId: userId, referralCode: code });
    }
    return referral;
};

const applyReferral = async (newUserId, code) => {
    const referral = await Referral.findOne({
        referralCode: code.toUpperCase(),
        status: 'pending',
    });
    if (!referral)
        throw Object.assign(new Error('Invalid or expired referral code'), { statusCode: 400 });
    if (referral.referrerId === newUserId)
        throw Object.assign(new Error('Cannot use your own referral code'), { statusCode: 400 });
    if (referral.referredId)
        throw Object.assign(new Error('Referral code already used'), { statusCode: 400 });

    referral.referredId = newUserId;
    referral.status = 'completed';
    referral.completedAt = new Date();
    await referral.save();

    return referral;
};

const getReferrals = async (userId, query) => {
    const { page, limit, skip } = paginate(query);
    const [referrals, total] = await Promise.all([
        Referral.find({ referrerId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Referral.countDocuments({ referrerId: userId }),
    ]);
    return { referrals, meta: paginateMeta(total, page, limit) };
};

const getReferralSummary = async (userId) => {
    const referral = await getOrCreateReferral(userId);
    const referrals = await Referral.find({ referrerId: userId }).sort({ createdAt: -1 }).limit(10);

    const totalEarned = referrals
        .filter((item) => item.status === 'rewarded')
        .reduce((sum, item) => sum + (item.rewardAmount || REFERRAL_REWARD), 0);
    const pendingRewards = referrals
        .filter((item) => ['pending', 'completed'].includes(item.status))
        .reduce(
            (sum, item) => sum + (item.status === 'completed' ? REFERRAL_REWARD : item.rewardAmount || 0),
            0
        );

    return {
        my_code: referral.referralCode,
        reward_per_friend: REFERRAL_REWARD,
        totals: {
            total_earned: totalEarned,
            pending_rewards: pendingRewards,
            friends_joined: referrals.filter((item) => Boolean(item.referredId)).length,
            total_referrals: referrals.length,
        },
        recent_referrals: referrals,
    };
};

module.exports = {
    getOrCreateReferral,
    applyReferral,
    getReferrals,
    getReferralSummary,
    REFERRAL_REWARD,
};
