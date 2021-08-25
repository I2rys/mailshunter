//Dependencies
const Puppeteer = require("puppeteer")
const Request = require("request")
const Chalk = require("chalk")
const Delay = require("delay")
const Fs = require("fs")

//Variables
const Self_Args = process.argv.slice(2)

var MailsHunter_Data = {}
MailsHunter_Data.links = []
MailsHunter_Data.emails = []
MailsHunter_Data.dork = ""

//Functions
async function GL(){
    const browser = await Puppeteer.launch({ headless: true, argvs: ["--no-sandbox", "--disable-setuid-sandbox"] })
    const page = await browser.newPage()

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36")
    await page.goto(`https://www.bing.com/search?q=site:pastebin.com intext:(${MailsHunter_Data.dork})`)

    const page_content = await page.content()

    if(page_content.indexOf("There are no results for") != -1){
        console.log(`${Chalk.grey("[") + Chalk.yellowBright("WARNING") + Chalk.grey("]")} Something went wrong while gathering some links, please try again later.`)
        console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} Aborting..`)
        browser.close()
        process.exit()
        return
    }

    var page_index = 1

    await page.waitForSelector("#b_results > li> h2 > a").catch(()=>{
        console.log(`${Chalk.grey("[") + Chalk.yellowBright("WARNING") + Chalk.grey("]")} Something went wrong while gathering some links, please try again later.`)
        console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} Aborting..`)
        browser.close()
        process.exit()
        return
    })

    const links = await page.$$eval("#b_results > li> h2 > a", elems =>{
        return elems.map(elem => elem.getAttribute("href"))
    })

    for( i in links ){
        MailsHunter_Data.links.push(links[i])
    }

    page_index += 1

    Repeater()
    async function Repeater(){
        await page.click(`#b_results > li.b_pag > nav > ul > li:nth-of-type(${page_index}) > a`).catch(()=>{
            console.log(`${Chalk.grey("[") + Chalk.yellowBright("WARNING") + Chalk.grey("]")} Max page detected, aborting links gatherer.`)
            console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} ${MailsHunter_Data.links.length} links has been gathered. Continuing to phase 2.`)
            browser.close()
            ES(page)
            return
        })
        await page.waitForSelector("#b_results > li> h2 > a")

        const links = await page.$$eval("#b_results > li> h2 > a", elems =>{
            return elems.map(elem => elem.getAttribute("href"))
        })
    
        for( i in links ){
            MailsHunter_Data.links.push(links[i])
        }

        if(page_index == Self_Args[1]){
            console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} ${MailsHunter_Data.links.length} links has been gathered. Continuing to phase 2.`)
            await browser.close()
            ES(page)
            return
        }
    
        page_index += 1

        Repeater()
        return
    }
}

async function ES(page){
    if(MailsHunter_Data.links.length == 0){
        console.log(`${Chalk.grey("[") + Chalk.yellowBright("WARNING") + Chalk.grey("]")} No links found on MailsHunter data.`)
        console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} Aborting..`)
        process.exit()
        return
    }

    var link_index = 0

    Repeater()
    async function Repeater(){
        Request(`${MailsHunter_Data.links[link_index]}`, function(err, res, body){
            if(err){
                link_index += 1
                Repeater()
                return
            }

            Main()
            async function Main(){
                await Delay(1000)

                const emails = body.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9.-]+/g)

                if(emails == null){
                    link_index += 1
    
                    if(link_index == MailsHunter_Data.links.length){
                        console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} ${MailsHunter_Data.emails.length} emails found. Continuing to the final phase.`)
                        D()
                        return
                    }
    
                    Repeater()
                    return
                }else{
                    link_index += 1
    
                    for( i in emails ){
                        if(emails[i].indexOf(".") != -1){
                            MailsHunter_Data.emails.push(emails[i])
                        }
                    }
    
                    if(link_index == MailsHunter_Data.links.length){
                        console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} ${MailsHunter_Data.emails.length} emails found. Continuing to the final phase.`)
                        D()
                        return
                    }
    
                    Repeater()
                    return
                }
            }
        })
    }
}

function D(){
    var emails = ""

    console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} Saving the emails that has been found to the output you specified.`)

    for( i in MailsHunter_Data.emails ){
        if(emails.length == 0){
            emails = MailsHunter_Data.emails[i]
        }else{
            emails += `\n${MailsHunter_Data.emails[i]}`
        }
    }
    Fs.writeFileSync(Self_Args[2], emails, "utf8")

    console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} Emails has been saved, exiting.`)
    process.exit()
}

//Main
if(Self_Args.length == 0){
    console.log(`node index.js <email_services(Multiple emails slicer :)> <max_page> <output>
Example: node index.js @gmail.com:@yahoo.com 2 ./test_output.txt`)
    process.exit()
}

if(Self_Args[0] == ""){
    console.log(`${Chalk.grey("[") + Chalk.redBright("ERROR") + Chalk.grey("]")} Invalid email service/services.`)
    process.exit()
}

if(Self_Args[0].indexOf("@") == -1){
    console.log(`${Chalk.grey("[") + Chalk.redBright("ERROR") + Chalk.grey("]")} Invalid email service/services.`)
    process.exit()
}

if(Self_Args[1] == ""){
    console.log(`${Chalk.grey("[") + Chalk.redBright("ERROR") + Chalk.grey("]")} Invalid max_page.`)
    process.exit()
}

if(isNaN(Self_Args[1])){
    console.log(`${Chalk.grey("[") + Chalk.redBright("ERROR") + Chalk.grey("]")} max_page is not an Int.`)
    process.exit()
}

if(Self_Args[2] == ""){
    console.log(`${Chalk.grey("[") + Chalk.redBright("ERROR") + Chalk.grey("]")} Invalid output.`)
    process.exit()
}

for( i in Self_Args[0].split(":") ){
    if(MailsHunter_Data.dork.length == 0){
        MailsHunter_Data.dork = Self_Args[0].split(":")[i]
    }else{
        MailsHunter_Data.dork += ` OR ${Self_Args[0].split(":")[i]}`
    }
}

console.log(`${Chalk.grey("[") + Chalk.blueBright("INFO") + Chalk.grey("]")} Looks like the arguments are good. Continuing to phase 1.`)
GL()
