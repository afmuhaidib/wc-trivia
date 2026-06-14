const { getStore } = require('@netlify/blobs');
const { generateMatches } = require('../../../data/matches');

module.exports = {
  onSuccess: async ({ netlifyConfig, utils }) => {
    try {
      const store = getStore('matches');
      const { blobs } = await store.list();
      if (blobs.length > 0) {
        console.log(`Matches already seeded (${blobs.length} found), skipping.`);
        return;
      }
      const matches = generateMatches();
      await Promise.all(matches.map((m) => store.setJSON(String(m.id), m)));
      console.log(`✅ Seeded ${matches.length} matches into Netlify Blobs`);
    } catch (err) {
      console.error('Seed error:', err.message);
    }
  },
};
