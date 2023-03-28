// create a simple expressjs application
import express, { json } from 'express'
import { createClient } from 'redis'
import { execSync } from 'child_process'
import { RedisClientType } from '@redis/client'

const app = express()
const port = 3000

// enable json parsing
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// define a route handler for the default home page
app.get('/', (req, res) => {
  res.send('Hello world!')
})

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`)
})

// define RESTFUl API endpoints,
// /api/v1/redis/newMember/:mac
app.post('/api/v1/redis/newMember', (req, res) => {
  const value = req.body

  console.info(`add new member: ${value.toString()}`)
  addNewMember(value)

  res.send('OK')
})

// define RESTFUl API endpoints
// app.get( '/api/v1/redis/members/:key', ( req, res ) => {
//     const key = req.params.key;

//     const member = getRedisValue( key );

//     res.json( member );
// } );

app.get('/api/v1/redis/members', async (req, res) => {
  const members = await getMembers()

  res.json(members)
})

app.get('/api/v1/redis/presence', async (req, res) => {
  const presence = await getPresence()

  console.info(presence)
  res.json(presence)
})

app.delete('/api/v1/redis/deleteMember/:mac', async (req, res) => {
  const mac = req.params.mac

  console.info(`delete member: ${mac}`)
  await deleteMember(mac)

  res.send('OK')
})

async function deleteMember(mac: string) {
  await redisClient.hDel('members', mac)
}

async function addNewMember(value: { mac: string; alias: string }) {
  await redisClient.hSet('members', value.mac, value.alias)
}

// async function getRedisValue( key: string ) {
//     const value = await redisClient.hGetAll( key );

//     return value;
// }

async function getMembers() {
  const members = await redisClient.hGetAll('members')

  return toJsObject(members)
}

// function to run bash command and return the result

function runCommand(command: string) {
  console.info(`running command: ${command}`)
  return execSync(command).toString()
}

let redisClient: RedisClientType<any, any, any>

// funtion to access a redis server
async function connectToRedis(): Promise<void> {
  const client = createClient()

  client.on('connect', () => {
    console.log('connected to redis')
  })

  client.on('error', (error: any) => {
    console.error(error)
  })

  await client.connect()

  redisClient = client
}

type Host = {
  ip: string
  status: string
  mac?: string
}

// function to parse the output of nmap command
function parseNmapOutput(output: string) {
  const lines = output.split('\n')
  const hosts: Host[] = []
  let host: Host = {
    ip: '',
    status: '',
  }
  for (let line of lines) {
    if (line.match(/^Nmap scan report for/)) {
      host = {
        ip: '',
        status: '',
      }
      hosts.push(host)

      // regex for filtering ip address

      var ipRegex = /(\d{1,3}\.){3}\d{1,3}/g

      host.ip = line.match(ipRegex)![0]
      // host.ip = line.split( ' ' )[ 4 ];
      console.info(`found host ${host.ip}`)
    } else if (line.match(/^Host is up/)) {
      console.info(`host ${host.ip} is up`)
      host.status = line.split(' ')[3]
    } else if (line.match(/^MAC Address/)) {
      console.info(`host ${host.ip} has mac address`)
      host.mac = line.split(' ')[2]
    }

    // else if ( line.match( /^Not shown/ ) ) {
    //     console.info( `host ${ host.ip } has open ports` );
    //     host.ports = line.split( ' ' )[ 4 ];
    // }
  }
  return hosts
}

// function to get a list of hosts from nmap
function getHosts(ip: string) {
  const output = runCommand(`sudo nmap -T4 -F ${ip}`)
  const hosts = parseNmapOutput(output)

  return hosts
}

async function getAllMembers() {
  if (redisClient === undefined) {
    console.error('redis client is not initialized')
  }

  console.info(redisClient)
  const members = await redisClient.hGetAll('members')

  return toJsObject(members)
}

async function getPresence() {
  const presence = await redisClient.sMembers('presence')

  return toJsObject(presence)
}

function toJsObject(target: any) {
  return JSON.parse(JSON.stringify(target))
}

async function setPresence() {
  var output = runCommand('sudo nmap -T4 -F 192.168.183.0/24')
  console.log(output)

  var hosts = parseNmapOutput(output)

  console.log(hosts)

  var candidates = hosts.filter((e) => e.hasOwnProperty('mac'))
  var registeredMembers = await getMembers()

  console.info(registeredMembers)

  await redisClient.del('presence')

  for (var c of candidates) {
    if (c.mac !== undefined) {
      if (registeredMembers.hasOwnProperty(c.mac)) {
        await redisClient.sAdd('presence', registeredMembers[c.mac])
      }
    }
  }
}

// funtion to use node-scheduler to run the nmap command every 15 miniutes
import { scheduleJob } from 'node-schedule'

async function main() {
  await connectToRedis()

  var job = scheduleJob('*/15 * * * *', async () => {
    console.info('running nmap')

    await setPresence()
    await persistRedis()
  })

  console.info('starting job')
  job.invoke()
}

main()

// function to presist the data in redis
async function persistRedis() {
  const data = await redisClient.bgSave()
  console.info(data)
}
