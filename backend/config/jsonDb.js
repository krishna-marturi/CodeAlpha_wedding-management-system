const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection(collection) {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${collection}.json:`, err);
    return [];
  }
}

function writeCollection(collection, data) {
  const filePath = getFilePath(collection);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing ${collection}.json:`, err);
  }
}

// Helper to match objects based on queries (supports basic equal, $in, $ne, $or)
function matchQuery(item, query) {
  for (const key in query) {
    const queryVal = query[key];
    const itemVal = item[key];

    if (key === '$or') {
      if (!Array.isArray(queryVal)) continue;
      const match = queryVal.some(subQuery => matchQuery(item, subQuery));
      if (!match) return false;
      continue;
    }

    if (queryVal && typeof queryVal === 'object' && !Array.isArray(queryVal)) {
      if ('$in' in queryVal) {
        const inArray = Array.isArray(queryVal.$in) ? queryVal.$in : [queryVal.$in];
        const stringInArray = inArray.map(v => String(v));
        if (Array.isArray(itemVal)) {
          const itemStrings = itemVal.map(v => typeof v === 'object' && v.userId ? String(v.userId) : String(v));
          if (!itemStrings.some(v => stringInArray.includes(v))) return false;
        } else {
          if (!stringInArray.includes(String(itemVal))) return false;
        }
        continue;
      }
      if ('$ne' in queryVal) {
        if (String(itemVal) === String(queryVal.$ne)) return false;
        continue;
      }
    }

    // Direct match
    if (queryVal !== undefined) {
      if (Array.isArray(itemVal)) {
        // If it's a member array in project, check if query matches userId inside user object or matches string
        const matchesArray = itemVal.some(v => {
          if (typeof v === 'object' && v !== null) {
            return String(v.userId) === String(queryVal) || String(v.user) === String(queryVal);
          }
          return String(v) === String(queryVal);
        });
        if (!matchesArray) return false;
      } else {
        if (String(itemVal) !== String(queryVal)) return false;
      }
    }
  }
  return true;
}

class JsonModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  async find(query = {}) {
    const data = readCollection(this.collectionName);
    return data.filter(item => matchQuery(item, query));
  }

  async findOne(query = {}) {
    const data = readCollection(this.collectionName);
    return data.find(item => matchQuery(item, query)) || null;
  }

  async findById(id) {
    const data = readCollection(this.collectionName);
    return data.find(item => String(item._id) === String(id)) || null;
  }

  async create(doc) {
    const data = readCollection(this.collectionName);
    const newDoc = {
      _id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...doc
    };
    data.push(newDoc);
    writeCollection(this.collectionName, data);
    return newDoc;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const data = readCollection(this.collectionName);
    const index = data.findIndex(item => String(item._id) === String(id));
    if (index === -1) return null;

    let updatedItem = { ...data[index], updatedAt: new Date().toISOString() };

    if (update.$set) {
      updatedItem = { ...updatedItem, ...update.$set };
    } else if (update.$push) {
      for (const key in update.$push) {
        if (!Array.isArray(updatedItem[key])) updatedItem[key] = [];
        updatedItem[key].push(update.$push[key]);
      }
    } else if (update.$pull) {
      for (const key in update.$pull) {
        if (Array.isArray(updatedItem[key])) {
          const val = update.$pull[key];
          updatedItem[key] = updatedItem[key].filter(i => {
            if (typeof val === 'object' && val !== null) {
              return !Object.keys(val).every(k => String(i[k]) === String(val[k]));
            }
            return String(i) !== String(val);
          });
        }
      }
    } else {
      updatedItem = { ...updatedItem, ...update };
    }

    data[index] = updatedItem;
    writeCollection(this.collectionName, data);
    return updatedItem;
  }

  async findByIdAndDelete(id) {
    const data = readCollection(this.collectionName);
    const item = data.find(item => String(item._id) === String(id));
    if (!item) return null;
    const filtered = data.filter(item => String(item._id) !== String(id));
    writeCollection(this.collectionName, filtered);
    return item;
  }

  async deleteMany(query = {}) {
    const data = readCollection(this.collectionName);
    const filtered = data.filter(item => !matchQuery(item, query));
    writeCollection(this.collectionName, filtered);
    return { deletedCount: data.length - filtered.length };
  }

  async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }
}

module.exports = {
  JsonModel,
  readCollection,
  writeCollection
};
