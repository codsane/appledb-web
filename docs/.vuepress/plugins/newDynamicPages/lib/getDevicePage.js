const iosList = require('../../../../../grabData/ios')
const deviceList = require('../../../../../grabData/deviceList')
const deviceGroups = require('../../../../../grabData/deviceGroups')
const jbList = require('../../../../../grabData/jailbreak')
const bigJson = {
  ios: iosList,
  jailbreak: jbList,
  device: deviceList,
  groups: deviceGroups.sort(function(a,b) {
    const c = [a, b].map(x => JSON.stringify(x)).map(x => JSON.parse(x)) // don't ask

    if (c[0].subtype) c[0].type = [c[0].type,c[0].subtype].join('')
    if (c[1].subtype) c[1].type = [c[1].type,c[1].subtype].join('')

    if (c[0].type < c[1].type) return -1
    if (c[0].type > c[1].type) return 1
    
    if (c[0].released > c[1].released) return -1
    if (c[0].released < c[1].released) return 1

    if (c[0].name > c[1].name) return -1
    if (c[0].name < c[1].name) return 1

    return 0
  })
}

var bigObj = {}
for (const f of iosList) {
  const b = f.build
  const devArr = ((f.devices) ? Object.keys(f.devices) : [])
  bigObj[b] = {}
  for (const d of devArr) {
    bigObj[b][d] = []
    var jbStringArr = []
    for (const jb of jbList) {
      if (!jb.hasOwnProperty('compatibility')) continue
      for (const c of jb.compatibility) {
        if (!c.firmwares.includes(b)) continue
        if (!c.devices.includes(d)) continue

        const jbString = JSON.stringify(jb)
        if (jbStringArr.includes(jbString)) continue
        jbStringArr.push(jbString)

        bigObj[b][d].push(jb)
      }
    }
  }
}

module.exports = function(args) {
    if (!Array.isArray(args.devArr)) args.devArr = [args.devArr]
    const devArr = args.devArr
    const name = args.name
    const devPath = args.path
    const description = args.description
    const grouped = args.grouped
    const mainList = args.mainList
    const hideChildren = args.hideChildren

    let devFwArr = iosList
    
    if (!mainList) devFwArr = iosList.filter(i => {
        const fwDevArr = Object.keys(i.devices)
        const devIdArr = devArr.map(x => x.identifier)
        for (const id of devIdArr) if (fwDevArr.includes(id)) return true
        return false
    })

    const devFwVersionArr = devFwArr.map(x => [x.osStr,x.version].join(' '))
    const duplicateVersionArr = devFwVersionArr.filter((fw, index) => index !== devFwVersionArr.indexOf(fw))

    function getDevType(type) {
        if (type.includes('iPad') || type == 'iPhone' || type == 'iPod touch') return 'iOS devices'
        if (type == 'AirPods' || type == 'Beats') return 'AirPods, Beats'
        if (type.includes('Mac') || type == 'Developer Transition Kit') return 'Mac'
        return type
    }

    const getVersionArr = devFwArr.map(i => {
        function getDlArr(propertyName) {
            let retArr = Object.keys(i.devices)
                .filter(x => devArr.map(x => x.identifier).includes(x))
                .map(x => {
                    if (!i.devices[x] || !i.devices[x][propertyName] || i.devices[x][propertyName] == 'none') return undefined
                    return {
                        deviceName: devArr.filter(y => y.identifier == x)[0].name,
                        identifier: x,
                        label: i.devices[x][propertyName].split('/')[i.devices[x][propertyName].split('/').length-1],
                        url: i.devices[x][propertyName]
                    }
                }
            ).filter(x => x)

            urlCount = Array.from(new Set(retArr.map(x => x.url))).length
            if (urlCount == 1) retArr = [retArr[0]]
            
            return retArr
        }

        const dlArr = getDlArr('ipsw')
        const otaArr = getDlArr('ota')

        const devIdFwArr = Object.keys(i.devices).filter(x => devArr.map(x => x.identifier).includes(x))
        const devTypeArr = Array.from(
            new Set(
                devIdFwArr.map(x => devArr.filter(y => y.identifier == x)[0])
                        .map(x => x.type)
                        .map(x => getDevType(x))
            )
        )

        let released
        if (!i.released) released = undefined
        else {
            const releasedArr = i.released.split('-')
            const dateStyleArr = [{ year: 'numeric'}, { dateStyle: 'medium'}, { dateStyle: 'medium'}]
            released = new Intl.DateTimeFormat('en-US', dateStyleArr[releasedArr.length-1]).format(new Date(i.released))
        }

        return {
            osStr: i.osStr,
            version: i.version,
            build: i.build,
            duplicateVersion: duplicateVersionArr.includes([i.osStr,i.version].join(' ')),
            url: `/firmware.html?os=${i.osStr}&build=${i.uniqueBuild}`,
            released: i.released,
            beta: i.beta,
            releasedStr: released,
            devices: devIdFwArr,
            deviceFilterArr: (mainList) ?
                devTypeArr :
                devIdFwArr,
            jailbreakArr: Array.from(
                new Set(
                devArr.map(d => d.identifier)
                        .map(d => bigObj[i.build][d])
                        .flat()
                        .map(x => x ? x.name : x)
                )
            ).filter(x => x),
            downloads: dlArr,
            otas: otaArr
        }
    }).reverse()

    const osStr = Array.from(new Set(getVersionArr.map(x => x.osStr)))

    const head = (mainList) ? [] : [
        [
        "meta",
        {
            property: "og:image",
            content: `https://img.appledb.dev/device@256/${devArr[0].identifier}/0.png`
        }
        ]
    ]

    const propertyArr = ['name','identifier','released','soc','arch','model','board']
    const infoArr = devArr.map(x => {
        var o = {}
        for (const p of propertyArr) if (x[p]) o[p] = x[p]
        return o
    })

    /*var extraInfo = undefined
    if (!mainList && devArr.map(x => x.info).filter(x => x).length > 0) {
        let extraInfoObj = {}
        for (const i of devArr) extraInfoObj[i.identifier] = i.info

        extraInfo = []
        for (const dev in extraInfoObj)
        if (extraInfoObj[dev])
        for (const i of extraInfoObj[dev]) {
            if (!extraInfo.map(x => x.type).includes(i.type)) {
                let retObj = {}
                for (p in i) retObj[p] = p == 'type' ? i[p] : [i[p]] 
                extraInfo.push(retObj)
            } else {
                let retObj = extraInfo.filter(x => x.type == i.type)[0]
                let properties = Array.from(new Set(Object.keys(i).concat(Object.keys(retObj)).filter(x => x != 'type')))
                for (p of properties) {
                    if (!retObj.hasOwnProperty(p)) retObj[p] = [i[p]]
                    else if (!retObj[p].map(x => JSON.stringify(x)).includes(JSON.stringify(i[p]))) retObj[p].push(i[p])
                }
            }
        }
    }*/
    var extraInfo = undefined
    if (!mainList && devArr.map(x => x.info).filter(x => x).length > 0) {
        extraInfo = {}
        for (const i of devArr) extraInfo[i.identifier] = i.info
    }

    const img = {
        count: devArr[0].imgCount,
        dark: devArr[0].imgDark
    }

    const hasJbArr = [
        'iOS',
        'tvOS',
        'audioOS',
        'watchOS',
        'iPhoneOS',
        'iPadOS',
        'Apple TV Software'
    ]

    var imgCount = 0
    try {
        imgCount = fs.readdirSync(`docs/.vuepress/public/assets/images/device@256/${devArr[0].identifier}/`).length
    } catch {
        imgCount = 0
    }

    return {
        path: devPath,
        frontmatter: {
            title: name,
            description: description || `Information lookup for ${name}`,
            chartType: 'device',
            widePage: true,
            device: infoArr,
            versionArr: getVersionArr,
            grouped: grouped,
            hideChildren: hideChildren,
            imgCount: imgCount,
            mainList: mainList,
            noJb: (!(osStr.some(r => hasJbArr.includes(r))) && !mainList),
            img: img,
            extraInfo: extraInfo || undefined,
            deviceFilter: (mainList) ? 
                ['Filter'].concat(Array.from(new Set(devArr.map(x => getDevType(x.type)))).sort((a, b) => a.localeCompare(b))).map(x => {
                    return {
                        label: x,
                        value: x
                    }
                }) :
                [devArr].map(x => {
                    const nameArr = x.map(y => y.name)
                    const idenArr = x.map(y => y.identifier)
                    return {
                        label: nameArr.join(', '),
                        value: idenArr
                    }
                }).concat(devArr.map(x => {
                    return {
                        label: x.name,
                        value: [x.identifier]
                    }
                })),

            head: head,

            sidebar: false,
            editLink: false,
            lastUpdated: false,
            contributors: false
        }
    }
}