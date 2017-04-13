var FormData = require('form-data')

// TODO: use a package for this
var obj = '[object Object]'
var isSrslyObject = function (x) {
  return x &&
  x.toString ?
  x.toString() === obj :
  Object.prototype.toString.call(x) === obj
}

var isInstanceOfClass = function (name, x) {
  return x && x.toString && x.toString() === '[object ' + name + ']'
}

var formatters = {
  'application/json': function (v) {
    return typeof v === 'string' ? v : JSON.stringify(v)
  },
  'multipart/form-data': function (v) {
    if (isInstanceOfClass('FormData', v)) {
      return v
    }
    if (typeof v !== 'object') {
      throw new TypeError('value to be converted to FormData should be an object')
    }
    var form = new FormData()
    Object.keys(v).forEach(function (name) {
      form.append(name, v[name])
    })
    return form
  },
  'text/plain': String
}

var determineType = function (body) {
  if (isSrslyObject(body) || Array.isArray(body)) {
    return 'application/json'
  } else if (isInstanceOfClass('FormData', body)) {
    return 'multipart/form-data'
  } else if (body != null && Object(body) !== body) {
    return 'text/plain'
  }
  return undefined // this isn't a thing we deal with
}

var content = function (request, next) {
  var headers = request.init.headers
  var body = request.init.body

  if (body === undefined) {
    return next(request)
  }

  var type = headers.get('Content-Type') || determineType(body)
  var format = formatters[type]

  if (format) {
    try {
      body = format(body)
    } catch (err) {
      err.type = 'FETCHWARE_CONTENT'
      throw err
    }
  }

  type && headers.set('Content-Type', type)
  if (isInstanceOfClass('FormData', body)) {
    // remove content type so that it can be set automatically with boundary
    headers.delete('Content-Type')
  }

  request.init.body = body
  return next(request)
}

module.exports = content
