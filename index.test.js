var test = require('tape')
var FormData = require('form-data')
var normalize = require('../fetchware/normalize')
var content = require('./')

test('when body is regular object', function (t) {
  content(
    normalize('/foo', { body: { foo: 123 } }),
    function (request) {
      t.deepEqual(
        JSON.parse(request.init.body),
        { foo: 123 },
        'JSON stringified body'
      )
      t.equal(
        request.init.headers.get('Content-Type'),
        'application/json',
        'set json content type'
      )
    }
  )

  t.end()
})

test('when body is FormData object', function (t) {
  content(
    normalize('/foo', {
      headers: { 'Content-Type': 'multipart/form-data' },
      body: new FormData()
    }),
    function (request) {
      t.equal(
        request.init.body.toString(),
        '[object FormData]',
        'did nothing to body'
      )
      t.equal(
        request.init.headers.get('Content-Type'),
        null,
        'removed content type (so that it can be set automatically with boundary)'
      )
    }
  )

  t.end()
})

test('when body is string', function (t) {
  content(
    normalize('/foo', { body: 'just some text' }),
    function (request) {
      t.equal(
        request.init.headers.get('Content-Type'),
        'text/plain',
        'set text content type when body is regular string'
      )
      t.equal(
        request.init.body,
        'just some text',
        'did not modify body'
      )
    }
  )
  content(
    normalize('/foo', { body: '<html></html>' }),
    function (request) {
      t.equal(
        request.init.headers.get('Content-Type'),
        'text/plain',
        'set text content type when body is string of html'
      )
      t.equal(
        request.init.body,
        '<html></html>',
        'did not modify body'
      )
    }
  )

  content(
    normalize('/foo', { body: JSON.stringify({ foo: 123 }) }),
    function (request) {
      t.equal(
        request.init.headers.get('Content-Type'),
        'text/plain',
        'set text content type when body is string of json (use object for json content type)'
      )
      t.deepEqual(
        JSON.parse(request.init.body),
        { foo: 123 },
        'did not modify body'
      )
    }
  )

  t.end()
})

test('does nothing when no body given', function (t) {
  content(
    normalize('/foo', { headers: {}, method: 'POST' }),
    function (request) {
      t.deepEqual(
        request.init,
        { headers: {}, method: 'POST' }
      )
    }
  )

  content(
    normalize('/foo', { headers: { 'Content-Type': 'application/json' } }),
    function (request) {
      t.equal(
        request.init.body,
        undefined,
        'when content type header already set'
      )
      t.equal(
        request.init.headers.get('Content-Type'),
        'application/json',
        'when content type header already set'
      )
    }
  )

  t.end()
})

test('when content type header is already set', function (t) {
  content(
    normalize('/foo', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 123 })
    }),
    function (request) {
      t.equal(
        request.init.body,
        JSON.stringify({ foo: 123 }),
        'does nothing when type is json and body is already a string'
      )
      t.equal(
        request.init.headers.get('Content-Type'),
        'application/json',
        'does nothing when type is json and body is already a string'
      )
    }
  )

  content(
    normalize('/foo', {
      headers: { 'Content-Type': 'application/json' },
      body: { foo: 123 }
    }),
    function (request) {
      t.deepEqual(
        JSON.parse(request.init.body),
        { foo: 123 },
        'stringifies json when type is json and body is a json stringifiable object'
      )
    }
  )

  try {
    content(
      normalize('/foo', {
        headers: { 'Content-Type': 'application/json' },
        body: { foo: (function() { var x = {}; x.x = x; return x })() }
      }),
      function (request) { console.log(request.init.body) }
    )
    t.fail('did not throw when type is json and body is not a json stringifiable object')
  } catch (err) {
    t.pass('throws when type is json and body is not a json stringifiable object')
    t.equal(err.type, 'FETCHWARE_CONTENT', "err.type === 'FETCHWARE_CONTENT'")
  }

  t.end()
})

test('when body is an otherwise useless primitive', function (t) {
  content(
    normalize('/foo', { body: 123 }),
    function (request) {
      t.equal(request.init.body, '123', 'turned number body into a string')
      t.equal(request.init.headers.get('Content-Type'), 'text/plain', 'set text content type')
    }
  )
  content(
    normalize('/foo', { body: false }),
    function (request) {
      t.equal(request.init.body, 'false', 'turned boolean body into a string')
      t.equal(request.init.headers.get('Content-Type'), 'text/plain', 'set text content type')
    }
  )
  content(
    normalize('/foo', { body: null }),
    function (request) {
      t.equal(request.init.body, null, 'left null body alone')
      t.equal(request.init.headers.get('Content-Type'), null, 'did not set type header')
    }
  )
  content(
    normalize('/foo', { body: undefined }),
    function (request) {
      t.equal(request.init.body, undefined, 'left undefined body alone')
      t.equal(request.init.headers.get('Content-Type'), null, 'did not set type header')
    }
  )

  try {
    content(
      normalize('/foo', {
        headers: { 'Content-Type': 'multipart/form-data' },
        body: 123
      }),
      function (request) { console.log(request.init.body) }
    )
    t.fail('should have thrown when content type is already set and the body is not compatible')
  } catch (err) {
    t.pass('throws when content type is already set and the body is not compatible')
  }

  t.end()
})
