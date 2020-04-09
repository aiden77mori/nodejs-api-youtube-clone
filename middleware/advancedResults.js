// @eg      housing=true&select=name,location.city&sort=-name,location.state
// ?averageCost[lte]=10000
const advancedResults = (
  model,
  populates,
  visibility = { status: '', filter: '' }
) => async (req, res, next) => {
  let query
  if (visibility.status == 'private') {
    req.query.userId = req.user._id
    if (visibility.filter == 'channel') {
      req.query.channelId = req.user._id
      delete req.query.userId
    }
  } else if (visibility.status == 'public') {
    req.query.status = 'public'
  }

  // if (req.query.visibility == 'true') {
  //   req.query.status = 'public'
  // } else if (!req.user) {
  //   console.log(req.user)
  //   return res
  //     .status(200)
  //     .json({ success: true, count: 0, totalPage: 1, pagination: {}, data: [] })
  // } else {
  //   req.query.userId = req.user._id
  //   console.log(req.query.userId)
  // }

  // delete req.query.visibility

  const reqQuery = { ...req.query }

  const removeFields = ['select', 'sort', 'page', 'limit']
  removeFields.forEach((param) => delete reqQuery[param])

  let queryStr = JSON.stringify(reqQuery)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`)

  query = model.find(JSON.parse(queryStr))

  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ')
    query = query.select(fields)
  }

  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ')
    query = query.sort(sortBy)
  } else {
    query = query.sort({ createdAt: -1 })
    // '-createdAt'
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 20
  const startIndex = (page - 1) * limit
  const endIndex = page * limit
  const total = await model.countDocuments()
  const totalPage = Math.ceil(total / limit)

  query = query.skip(startIndex).limit(limit)

  if (populates) {
    populates.forEach((populate) => {
      query = query.populate(populate)
    })
  }

  const results = await query

  // Pagination result
  const pagination = {}

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    }
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    }
  }

  res.advancedResults = {
    success: true,
    count: results.length,
    totalPage,
    pagination,
    data: results
  }
  next()
}

module.exports = advancedResults
