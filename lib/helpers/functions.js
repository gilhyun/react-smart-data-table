// Import modules
import flatten from 'flat'
import memoizeOne from 'memoize-one'
import escapeStringRegexp from 'escape-string-regexp'
import camelCase from 'camelcase'
import fileImgExtensions from './file-extensions'

// Lodash alternatives

const head = ([first]) => first

const tail = ([...arr]) => arr.pop()

const isString = str => typeof str === 'string' || str instanceof String

const isArray = obj => Array.isArray(obj)

const isObject = obj => obj && typeof obj === 'object' && obj.constructor === Object

const isEmpty = (obj) => {
  if (isArray(obj)) return !obj.length
  if (isObject(obj)) return !Object.keys(obj).length
  return false
}

const isFunction = fn => typeof fn === 'function'

const isNumber = num => typeof num === 'number' && Number.isFinite(num)

const isUndefined = undef => typeof undef === 'undefined'

const capitalize = str => (isString(str) ? str[0].toUpperCase() + str.substring(1) : '')

const sortBy = (arr, key) => [...arr].sort((a, b) => {
  if (a[key] > b[key]) return 1
  if (b[key] > a[key]) return -1
  return 0
})

// Custom functions

export function debugPrint(...args) {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
}

export function errorPrint(...args) {
  console.error(...args)
}

export function getNestedObject(nestedObj, pathArr) {
  if (isObject(nestedObj) && !isEmpty(nestedObj)) {
    let path = []
    if (isString(pathArr)) {
      path.push(pathArr)
    } else if (isArray(pathArr)) {
      path = pathArr
    }
    const reducerFn = (obj, key) => (
      (obj && !isUndefined(obj[key])) ? obj[key] : undefined
    )
    return path.reduce(reducerFn, nestedObj)
  }
}

export function fetchData(data, key = 'data') {
  return new Promise((resolve, reject) => {
    if (isArray(data)) {
      resolve(data)
    } else if (isString(data)) {
      fetch(data).then((response) => {
        const {
          ok, status, statusText,
        } = response
        if (ok || status === 200 || statusText === 'OK') {
          return response.json()
        }
        reject(new Error(`${status} - ${statusText}`))
      }).then((json) => {
        resolve(key ? json[key] : json)
      }).catch(reason => reject(reason))
    } else {
      reject(new Error('data type is invalid'))
    }
  })
}

export function capitalizeAll(arr) {
  return arr.map(capitalize).join(' ').trim()
}

const memoizedCapitalizeAll = memoizeOne(capitalizeAll)

export function parseHeader(val) {
  if (isString(val)) {
    const toCamelCase = camelCase(val)
    const parser = /^[a-z]+|[A-Z][a-z]*/g
    return memoizedCapitalizeAll(toCamelCase.match(parser))
  }
  return ''
}

export function valueOrDefault(value, dfault) {
  if (isUndefined(value)) return dfault
  return value
}

export function columnObject(key, headers = {}) {
  const {
    text, invisible, sortable, filterable,
  } = Object.assign({}, headers[key])
  return {
    key,
    text: valueOrDefault(text, parseHeader(key)),
    invisible: valueOrDefault(invisible, false),
    sortable: valueOrDefault(sortable, true),
    filterable: valueOrDefault(filterable, true),
  }
}

export function parseDataForColumns(data, headers) {
  const columns = []
  if (data && isArray(data) && !isEmpty(data)) {
    const filteredData = data.filter(row => !!row)
    const firstElement = flatten(head(filteredData))
    if (isObject(firstElement)) {
      const headKeys = Object.keys(firstElement)
      for (let i = 0, N = headKeys.length; i < N; i += 1) {
        const key = headKeys[i]
        columns.push(columnObject(key, headers))
      }
    }
  }
  return columns
}

export function parseDataForRows(data) {
  let rows = []
  if (data && isArray(data) && !isEmpty(data)) {
    const filteredData = data.filter(row => !!row)
    rows = filteredData.map(row => flatten(row))
  }
  return rows
}

export function filterRowsByValue(value, rows, colProperties) {
  return rows.filter((row) => {
    const regex = new RegExp(`.*?${escapeStringRegexp(value)}.*?`, 'i')
    let hasMatch = false
    const rowKeys = Object.keys(row)
    for (let i = 0, N = rowKeys.length; i < N; i += 1) {
      const key = rowKeys[i]
      const val = row[key]
      const colProps = Object.assign({}, colProperties[key])
      if (colProps.filterable !== false) {
        hasMatch = hasMatch || regex.test(val)
      }
    }
    return hasMatch
  })
}

const memoizedFilterRowsByValue = memoizeOne(filterRowsByValue)

export function filterRows(value, rows, colProperties) {
  if (!value) return rows
  return memoizedFilterRowsByValue(value, rows, colProperties)
}

export function sliceRowsPerPage(rows, currentPage, perPage) {
  if (isNumber(perPage) && Math.sign(perPage)) {
    const start = perPage * (currentPage - 1)
    const end = perPage * currentPage
    return rows.slice(start, end)
  }
  return rows
}

export function sortData(filterValue, colProperties, sorting, data) {
  let sortedRows = []
  const { dir, key } = sorting
  if (dir) {
    if (dir === 'ASC') {
      sortedRows = sortBy(data, [key])
    } else {
      sortedRows = sortBy(data, [key]).reverse()
    }
  } else {
    sortedRows = data.slice(0)
  }
  return filterRows(filterValue, sortedRows, colProperties)
}

export function isImage(url) {
  const parser = document.createElement('a')
  parser.href = url
  let { pathname } = parser
  const last = pathname.search(/[:?&#]/)
  if (last !== -1) pathname = pathname.substring(0, last)
  const ext = pathname.split('.').pop().toLowerCase()
  return fileImgExtensions.includes(ext)
}

const memoizeIsImage = memoizeOne(isImage)

export function highlightValueParts(value, filterValue) {
  if (!filterValue) return value
  const regex = new RegExp(`.*?${escapeStringRegexp(filterValue)}.*?`, 'i')
  if (filterValue && regex.test(value)) {
    const splitStr = value.toLowerCase().split(filterValue.toLowerCase())
    const nFirst = head(splitStr).length
    const nHighlight = filterValue.length
    const first = value.substring(0, nFirst)
    const highlight = value.substring(nFirst, nFirst + nHighlight)
    const last = value.substring(nFirst + nHighlight)
    return {
      first, highlight, last, value,
    }
  }
  return { value }
}

const memoizedHighlightValueParts = memoizeOne(highlightValueParts)

// Export Memoizations

export {
  memoizedCapitalizeAll, memoizeIsImage, memoizedHighlightValueParts,
}


// Export Lodash alternatives

export {
  head, tail, isString, isArray, isObject, isEmpty, isFunction, isNumber,
  isUndefined,
}
