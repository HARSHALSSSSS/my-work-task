/**
 * Returns mongoose-compatible skip/limit and meta for pagination
 */
const paginate = (query = {}) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

const paginateMeta = (total, page, limit) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
});

module.exports = { paginate, paginateMeta };
