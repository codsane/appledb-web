const deviceObj = require('../../../../../grabData/deviceList')

function sortDate(a,b) {
  const r = [a,b].map(x => new Date(x))
  if (r[0] < r[1]) return 1
  if (r[0] > r[1]) return -1
  return 0
}

const deviceList = require('../../../../../grabData/deviceGroups')
.filter(x => x.released)
.filter(x => x.type != 'Software')
.sort((a,b) => {
  const r = [a,b].map(x => {
    if (!Array.isArray(x.released)) return x.released
    else return x.released.sort((a,b) => -1 * sortDate(a,b))[0]
  })
  
  return sortDate(r[0], r[1])
})

let count = 0
let retArr = []

for (;;) {
  if (count > 19) break
  if (count > 9) {
    if (
      deviceList[count-1].type != deviceList[count].type && 
      deviceList[count-1].released != deviceList[count].released
    ) break
  }


  retArr.push(deviceList[count])

  count++
}

module.exports = retArr
.map(x => {
  let deviceArr = x.devices.map(x => deviceObj[x])

  if (deviceArr[0].imgCount > 0) {
    x.imgKey = deviceArr[0].key
    x.imgDark = deviceArr[0].imgDark
  } else {
    x.imgDark = true
    x.imgKey = 'logo'
  }

  return x
})