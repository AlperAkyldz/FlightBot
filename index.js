'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')

const app = express()

app.set('port', (process.env.PORT || 5000))

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// FB_PAGE_ACCESS_TOKEN
const token = "EAAFvVp3go98BAGVEnTn4M0HLzcJ7EZCGenJ1K8hvma97YFxuxzLn2NjGPTp25WQ5xyYeTZAZC0ikecMUreMLo3AqXveXwDoZBlxZCdlQyktEmCbR6D4EZBMOe4cObv136eapdqlvCc7l2OqTZB0TppbltCRXufZCoS4m3h7dPI7wgAZDZD"


app.get('/', function(req,res){
  res.send("Yoo")
})

app.get('/webhook/', function(req, res){
  if(req.query['hub.verify_token']==='myCustomToken123'){
    res.send(req.query['hub.challenge'])
  }
  res.send("Wrong token")
})

// to post data
app.post('/webhook/', function (req, res) {
  let messaging_events = req.body.entry[0].messaging
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    let sender = event.sender.id
    if (event.message && event.message.text) {
      let text = event.message.text
      if(text === 'Start'){
        sendTextMessage(sender, "Example search: Ankara,Istanbul,20/04/2017",token);
      }
      else{
        try{
          var messageParse= text.split(',');
          var from = messageParse[0];
          var to= messageParse[1];
          var dateParse=messageParse[2].split('/');
          var date=dateParse[2]+'-'+dateParse[1]+'-'+dateParse[0]; 
          flightList(from,to,date, function(result){
            sendTextMessage(sender, result, token);
          })
        }
        catch(err){
          console.log(err);
        }
      }
    }
  }
  res.sendStatus(200)
})

function flightList(from, to, date, callback){ 
  cityName(to,function(toCityResult){
    cityName(from,function(fromCityResult){
      var requestUrl = 'http://partners.api.skyscanner.net/apiservices/browseroutes/v1.0/TR/TRY/tr-TR/'+fromCityResult+'/'+toCityResult+'/'+ date +'?apiKey=al726837573649825720179932112830';
      request(requestUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var result = JSON.parse(body);
          var carrierId=result.Quotes[0].OutboundLeg.CarrierIds[0];
          var carrierName;
          for(var carrier in result.Carriers){
            if (result.Carriers[carrier].CarrierId == carrierId){
              carrierName=result.Carriers[carrier].Name;
            }
          }
          var date = result.Quotes[0].OutboundLeg.DepartureDate;
          date = date.split('T');
          date = date[0];
          var price = result.Quotes[0].MinPrice;
          var text = 'From ' + from+' to '+to+' at '+ date+'\nPrice: '+price+ ' with '+carrierName+'.';
          return callback(text);
        }
        else{
          console.log(error, body)
        }
      })
    })
  })
}

function cityName(city,callback){
  var cityNameRequestUrl ='http://partners.api.skyscanner.net/apiservices/autosuggest/v1.0/UK/GBP/en-GB?query='+city+'&apiKey=al726837573649825720179932112830';
  request(cityNameRequestUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var result = JSON.parse(body);
      return callback(result.Places[0].CityId);
    }
    else{
      console.log(error, body)
    }
  })
}

function sendTextMessage(sender, text) {
  let messageData = { text:text }
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

//Greeting message
function createGreetingApi(data) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: token },
    method: 'POST',
    json: data
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log("Greeting set successfully!");
    } else {
        console.error("Failed calling Thread Reference API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

function setGreetingText() {
  var greetingData = {
    setting_type: "greeting",
    greeting:{
      text:"Hi {{user_first_name}}, welcome!"
    }
  };
  createGreetingApi(greetingData);
}

// spin spin sugar
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
  setGreetingText();
})