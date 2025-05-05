module.exports.getPagination = (req, res, next) => {
  try {
    let { page, limit, keyword } = req.query;
    console.log(page, limit, keyword);
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 8;
    const offset = (page - 1) * limit;
    req.page = page;
    req.limit = limit;
    req.offset = offset;
    req.keyword = keyword || "";
    next();
  } catch (error) {
    console.log(error);
  }
};
