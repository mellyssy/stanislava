import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";
import { createReadStream, readFileSync } from "fs";

dotenv.config();

// add agent name, id and group to get tickets from. the name of the group should match .json file
const agents = [
  {
    name: 'Jane Doe',
    id: 2222,
    group: 'group 1'
  },
  {
    name: 'John Doe',
    id: 1111,
    group: 'group 2'
  }
];
const minutes = 1;

const groups = agents.map((agent) => agent.group);
const createTicketUrl = process.env.URL;
let messages;
let currMsgId = 0;

const makeFormData = ({ subject, messagePath, agent, files }) => {
  const formData = new FormData();
  formData.append('api_token', process.env.API_TOKEN);
  formData.append('subject', subject);
  formData.append('message', readFileSync(messagePath, 'utf-8'));
  formData.append('client_id', process.env.CLIENT_ID);
  formData.append('assignee_id', agent);
  formData.append('channel_id', process.env.CHANNEL_ID);
  files.forEach(fpath => {
    formData.append('files[]', createReadStream(fpath));
  });

  return formData;
};

const sendTicket = (url, formData) => {
  axios.post(url, formData, { headers: formData.getHeaders() })
  .then(({ data }) => {
    console.log(`status: ${data.status}`);
  });
};

const run = () => {
  sendTicket(createTicketUrl, makeFormData(messages[currMsgId]));
  currMsgId += 1;
  if (currMsgId < messages.length) {
    if (currMsgId % agents.length === 0) {
      setTimeout(run, 1000 * 60 * minutes);
    } else {
      run();
    }
  }
};

const prepData = (groups) => {
  const catalogues = groups.map((group) => {
    const groupArr = JSON.parse(readFileSync(`./mocks/${group}.json`));
    const agentsInGroup = agents.filter(a => (a.group === group));
    groupArr.forEach((obj, i) => {
      const idx = i >= agentsInGroup.length ? i % agentsInGroup.length : i;
      obj.agent = agentsInGroup[idx].id;
    });
    return groupArr;
  });
  const data = [];
  for (let i = 0; i < catalogues[0].length; i += 1) {
    for (let j = 0; j < catalogues.length; j += 1) {
      data.push(catalogues[j][i]);
    }
  }
  return data;
};

function init() {
  messages = prepData(groups);
  run();
};

init();