import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Category, Activity } from './types';

interface DiaryDB extends DBSchema {
  categories: {
    key: string;
    value: Category;
  };
  activities: {
    key: string;
    value: Activity;
    indexes: { 'by-category': string; 'by-date': string };
  };
  profile: {
    key: string;
    value: { id: string; name: string; title: string; avatar?: Blob };
  };
}

const DB_NAME = 'academic-diary-db';
const DB_VERSION = 2; // Increment version for new store

let dbPromise: Promise<IDBPDatabase<DiaryDB>>;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<DiaryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('categories', { keyPath: 'id' });
          const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
          activityStore.createIndex('by-category', 'categoryId');
          activityStore.createIndex('by-date', 'date');
        }
        if (oldVersion < 2) {
          db.createObjectStore('profile', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const db = {
  // Profile
  async getProfile() {
    const db = await getDB();
    return db.get('profile', 'user-profile');
  },
  async saveProfile(profile: { name: string; title: string; avatar?: Blob }) {
    const db = await getDB();
    await db.put('profile', { id: 'user-profile', ...profile });
  },

  // Categories
  async getCategories() {
    const db = await getDB();
    return db.getAll('categories');
  },
  async saveCategory(category: Category) {
    const db = await getDB();
    await db.put('categories', category);
  },
  async deleteCategory(id: string) {
    const db = await getDB();
    // Also delete all activities in this category
    const activities = await db.getAllFromIndex('activities', 'by-category', id);
    const tx = db.transaction(['categories', 'activities'], 'readwrite');
    await tx.objectStore('categories').delete(id);
    for (const activity of activities) {
      await tx.objectStore('activities').delete(activity.id);
    }
    await tx.done;
  },

  // Activities
  async getActivities(categoryId?: string) {
    const db = await getDB();
    if (categoryId) {
      return db.getAllFromIndex('activities', 'by-category', categoryId);
    }
    return db.getAll('activities');
  },
  async saveActivity(activity: Activity) {
    const db = await getDB();
    await db.put('activities', activity);
  },
  async deleteActivity(id: string) {
    const db = await getDB();
    await db.delete('activities', id);
  },
  async getActivity(id: string) {
    const db = await getDB();
    return db.get('activities', id);
  }
};
