// ============================================================
// WORLD DATA — Islands, biomes, NPCs, crystals, shrines
// ============================================================

export const PALETTE = {
  softPurple:   '#9B9AE2', softPurpleN:   0x9B9AE2,
  coralRed:     '#EB6259', coralRedN:     0xEB6259,
  softLavender: '#C6C3DC', softLavenderN: 0xC6C3DC,
  goldenYellow: '#EBB21A', goldenYellowN: 0xEBB21A,
  warmCream:    '#F0DEC2', warmCreamN:    0xF0DEC2,
  deepPlum:     '#4F4261', deepPlumN:     0x4F4261,
  oliveGreen:   '#6F7E4A', oliveGreenN:   0x6F7E4A,
  softPink:     '#F29FD7', softPinkN:     0xF29FD7,
};

export const ISLANDS = [
  {
    id: 0, name: 'Mossy Forest',
    skyTop: '#9B9AE2', skyBot: '#C6C3DC',
    groundColor: 0x6F7E4A, accentColor: 0x9B9AE2,
    fogColor: 0xC6C3DC, fogNear: 18, fogFar: 35,
    ambientColor: 0xC6C3DC, ambientInt: 0.6,
    sunColor: 0xF0DEC2, sunInt: 0.5,
    unlocked: true, restored: false,
    crystalCount: 0, totalCrystals: 5,
    mapPos: { x: 0.5, y: 0.22 },
    mechanic: 'shadow',
    tiles: buildTiles(0),
    crystalPositions: [{x:-2,z:-2},{x:3,z:1},{x:-1,z:3},{x:4,z:-3},{x:-4,z:2}],
    shrinePos: {x:0,z:0},
    npcs: [
      { name:'Elder Moss', x:2, z:-1, color:0x6F7E4A,
        lines:["Ah, young Lantern Bearer! The forest dims each day…","The crystal shards hold the Star's lost light. Seek them!","My old bones feel the shadow creeping closer…"],
        restoredLine:"The light returns! Oh, I can smell the blooms again!" },
      { name:'Fern', x:-3, z:2, color:0x9B9AE2,
        lines:["I used to see fireflies every night. Now… nothing.","The glowing orbs — those are the crystal shards!","Be careful of the shadow wisps. Lantern light freezes them."],
        restoredLine:"It's warm again! Thank you, Lantern Bearer!" },
      { name:'Sprite', x:3, z:3, color:0xF29FD7,
        lines:["I'm Sprite! I love sparkly things ✨","Did you know your lantern is SPECIAL? Try pressing E!","The shrine is at the center of the forest. Can you feel it?"],
        restoredLine:"SPARKLES! SO MANY SPARKLES! You did it!!" },
    ]
  },
  {
    id: 1, name: 'Sunflower Beach',
    skyTop: '#EBB21A', skyBot: '#C6C3DC',
    groundColor: 0xF0DEC2, accentColor: 0xEBB21A,
    fogColor: 0xF0DEC2, fogNear: 20, fogFar: 40,
    ambientColor: 0xEBB21A, ambientInt: 0.7,
    sunColor: 0xEBB21A, sunInt: 0.8,
    unlocked: false, restored: false,
    crystalCount: 0, totalCrystals: 5,
    mapPos: { x: 0.22, y: 0.25 },
    mechanic: 'tidal',
    tiles: buildTiles(1),
    crystalPositions: [{x:-3,z:-1},{x:2,z:2},{x:-2,z:3},{x:4,z:0},{x:0,z:-4}],
    shrinePos: {x:0,z:0},
    npcs: [
      { name:'Sandy', x:2, z:-2, color:0xEBB21A,
        lines:["Welcome to Sunflower Beach! Watch the tides…","Some paths only appear when the tide is low.","Find the tidal altar to control the water level!"],
        restoredLine:"The sunflowers are blooming again! Oh happy day!" },
      { name:'Crab', x:-2, z:1, color:0xEB6259,
        lines:["*click click* Tides go in, tides go out.","Low tide reveals the hidden path to the eastern shard!","*click* You smell like adventure. And lantern oil."],
        restoredLine:"*happy clicking* The water is warm and golden again!" },
      { name:'Driftwood', x:3, z:3, color:0xF0DEC2,
        lines:["I've drifted here from a faraway island.","The Guardian Star once made these waters glow at night.","I hope you can bring that light back…"],
        restoredLine:"I can see the reflection of stars in the water again!" },
    ]
  },
  {
    id: 2, name: 'Sakura Cove',
    skyTop: '#4F4261', skyBot: '#9B9AE2',
    groundColor: 0x4F4261, accentColor: 0xEB6259,
    fogColor: 0x9B9AE2, fogNear: 16, fogFar: 30,
    ambientColor: 0x9B9AE2, ambientInt: 0.5,
    sunColor: 0xEBB21A, sunInt: 0.6,
    unlocked: false, restored: false,
    crystalCount: 0, totalCrystals: 5,
    mapPos: { x: 0.78, y: 0.25 },
    mechanic: 'heat',
    tiles: buildTiles(2),
    crystalPositions: [{x:-2,z:-3},{x:3,z:2},{x:-3,z:1},{x:2,z:-1},{x:0,z:4}],
    shrinePos: {x:0,z:0},
    npcs: [
      { name:'Ember', x:2, z:-2, color:0xEB6259,
        lines:["The lava cracks appeared when the Star shattered.","Find water jars near the pond to cool the lava paths.","Three cooling steps open the way to the final shard!"],
        restoredLine:"The fire flowers are beautiful again, not dangerous!" },
      { name:'Blossom', x:-3, z:2, color:0xF29FD7,
        lines:["Cherry petals used to dance here year-round…","Now they only fall near the sacred sakura tree.","Your lantern light makes the petals glow pink ✨"],
        restoredLine:"Look! The petals are falling again! Just like before!" },
      { name:'Ashrock', x:3, z:3, color:0x4F4261,
        lines:["I am Ashrock. I have watched this cove for centuries.","The lava was once gentle warmth. Now it burns with grief.","Restore the shrine, young one. The cove remembers beauty."],
        restoredLine:"…The grief lifts. Thank you, Lantern Bearer. Truly." },
    ]
  },
  {
    id: 3, name: 'Cozy Village',
    skyTop: '#EBB21A', skyBot: '#F0DEC2',
    groundColor: 0xF0DEC2, accentColor: 0xEB6259,
    fogColor: 0xF0DEC2, fogNear: 20, fogFar: 40,
    ambientColor: 0xEBB21A, ambientInt: 0.65,
    sunColor: 0xEBB21A, sunInt: 0.7,
    unlocked: false, restored: false,
    crystalCount: 0, totalCrystals: 5,
    mapPos: { x: 0.38, y: 0.55 },
    mechanic: 'social',
    tiles: buildTiles(3),
    crystalPositions: [{x:-2,z:-2},{x:3,z:1},{x:-1,z:3},{x:4,z:-2},{x:0,z:-3}],
    shrinePos: {x:0,z:0},
    npcs: [
      { name:'Baker Bun', x:2, z:-2, color:0xF0DEC2,
        lines:["Oh dear! My little cat Mochi ran off again!","If you find Mochi, I'll give you the crystal shard I found!","Mochi has orange fur and loves sparkly things… hmm…"],
        quest: { type:'find_cat', reward: 0, done: false },
        restoredLine:"Mochi is safe AND the light is back! This is the best day!" },
      { name:'Gardener', x:-3, z:1, color:0x6F7E4A,
        lines:["My garden is wilting without the Star's warmth…","Could you bring me a water jar from the well? Please?","The well is just to the east. The jar should be there."],
        quest: { type:'fetch_water', reward: 1, done: false },
        restoredLine:"My flowers! They're blooming! I'm going to cry happy tears!" },
      { name:'Elder Owl', x:0, z:3, color:0x4F4261,
        lines:["Hoo hoo. I am the keeper of the village lore.","The crystal shards respond to kindness, young one.","Help the baker and the gardener. Then come to me last."],
        quest: { type:'elder_final', reward: 2, done: false, requires:['find_cat','fetch_water'] },
        restoredLine:"Hoo hoo… The warmth returns. The Star remembers us." },
    ]
  },
  {
    id: 4, name: 'Crystal Cave',
    skyTop: '#4F4261', skyBot: '#9B9AE2',
    groundColor: 0x4F4261, accentColor: 0x9B9AE2,
    fogColor: 0x4F4261, fogNear: 12, fogFar: 25,
    ambientColor: 0x9B9AE2, ambientInt: 0.3,
    sunColor: 0xC6C3DC, sunInt: 0.4,
    unlocked: false, restored: false,
    crystalCount: 0, totalCrystals: 5,
    mapPos: { x: 0.65, y: 0.6 },
    mechanic: 'echo',
    tiles: buildTiles(4),
    crystalPositions: [{x:-3,z:-2},{x:2,z:3},{x:-2,z:2},{x:3,z:-1},{x:0,z:-3}],
    shrinePos: {x:0,z:0},
    npcs: [
      { name:'Glimmer', x:2, z:-2, color:0xC6C3DC,
        lines:["Shh… sound travels far in here.","Press E to send a lantern echo — it reveals hidden ledges!","The deepest shard is in a chamber only the echo can find."],
        restoredLine:"The crystals are singing again! Do you hear it?" },
      { name:'Stalagmite', x:-3, z:2, color:0x9B9AE2,
        lines:["I have grown here for ten thousand years.","The bioluminescent pools used to light this cave naturally.","They dimmed when the Star fell. Your lantern helps."],
        restoredLine:"I glow again! After all these centuries… I glow!" },
      { name:'Echo', x:3, z:3, color:0xF29FD7,
        lines:["*whispers* I am the cave's echo given form…","Every sound here remembers itself for a moment.","Use your lantern pulse wisely. The cave will answer."],
        restoredLine:"*resonating warmth* The cave sings your name, Lantern Bearer." },
    ]
  },
  {
    id: 5, name: 'Lavender Highlands',
    skyTop: '#C6C3DC', skyBot: '#9B9AE2',
    groundColor: 0xC6C3DC, accentColor: 0x9B9AE2,
    fogColor: 0xC6C3DC, fogNear: 15, fogFar: 30,
    ambientColor: 0xC6C3DC, ambientInt: 0.6,
    sunColor: 0xF0DEC2, sunInt: 0.5,
    unlocked: false, restored: false,
    crystalCount: 0, totalCrystals: 5,
    mapPos: { x: 0.25, y: 0.75 },
    mechanic: 'wind',
    tiles: buildTiles(5),
    crystalPositions: [{x:-2,z:-2},{x:3,z:1},{x:-3,z:2},{x:2,z:-3},{x:0,z:4}],
    shrinePos: {x:0,z:0},
    npcs: [
      { name:'Zephyr', x:2, z:-2, color:0xC6C3DC,
        lines:["The wind carries memories of the Guardian Star here.","Activate the windmills to redirect the gusts — they open gates!","The final shard is at the peak, past three windmill gates."],
        restoredLine:"The wind smells of lavender again. It smells like home." },
      { name:'Windkeeper', x:-3, z:1, color:0x9B9AE2,
        lines:["I have tended these windmills for generations.","The wind stopped the day the Star fell. The mills stood still.","Now you've come. Perhaps the mills will turn again."],
        restoredLine:"*tearfully* They're turning! Oh, listen to them sing!" },
      { name:'Ancient Keeper', x:0, z:3, color:0x4F4261,
        lines:["Young Lantern Bearer… I have waited so long.","The prophecy spoke of one who would carry light through six islands.","This is the final island. The Guardian Star awaits you at the shrine.","Place the crystals. Let the light return. You have earned this."],
        restoredLine:"*smiles softly* The Star shines. And so do you, dear child." },
    ]
  }
];

function buildTiles(islandId) {
  const tiles = [];
  const size = 9;
  for (let x = -size; x <= size; x++) {
    for (let z = -size; z <= size; z++) {
      const dist = Math.sqrt(x*x + z*z);
      if (dist <= size - Math.abs(Math.sin(x*0.7+z*0.5))*1.5) {
        tiles.push({x, z, type: dist > size-2 ? 'water' : 'ground'});
      }
    }
  }
  return tiles;
}

export function getIsland(id) { return ISLANDS[id]; }
export function getUnlockedIslands() { return ISLANDS.filter(i=>i.unlocked); }
