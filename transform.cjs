const fs = require('fs');

const path = 'c:/Users/Saim/Desktop/DairyPro/SAIM Dairy Farm/database.rules.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const newRules = {
    rules: {
        users: {
            "$uid": {
                ".read": "$uid === auth.uid",
                ".write": "$uid === auth.uid"
            }
        },
        farms: {
            "$farmId": {
                ".read": "root.child('users').child(auth.uid).child('farmId').val() === $farmId",
                ".write": "root.child('users').child(auth.uid).child('farmId').val() === $farmId"
            }
        }
    }
};

const oldRules = data.rules;
for (const key in oldRules) {
    if (key !== 'users') {
        const node = oldRules[key];
        // Remove .read and .write from the node since they are handled at the farm level
        delete node['.read'];
        delete node['.write'];
        newRules.rules.farms["$farmId"][key] = node;
    }
}

fs.writeFileSync(path, JSON.stringify(newRules, null, 4));
console.log('Transformed database.rules.json successfully.');
