import axios from "axios";
import fs from "fs/promises";
import { logger } from "./logger";

export interface ItemData {
  audioVolume: number;
  breakHits: number;
  canPlayerSit: boolean;
  clothingType: number;
  collisionType: number;
  description: string;
  extraFieldUnk_4: number;
  extraFile: string;
  extraFileHash: number;
  extraOptions: string;
  extraOptions2: string;
  growTime: number;
  hitSoundType: number;
  isRayman: number;
  isStripeyWallpaper: number;
  itemCategory: number;
  itemID: number;
  itemKind: number;
  itemProps1: number;
  itemProps2: number;
  maxAmount: number;
  mods: number;
  name: string;
  newInt1: number;
  newInt2: number;
  newValue: number;
  newValue1: number;
  newValue2: number;
  newValue3: number;
  newValue4: number;
  newValue5: number;
  newValue6: number;
  newValue7: number;
  newValue8: number;
  newValue9: number;
  petAbility: string;
  petName: string;
  petPrefix: string;
  petSuffix: string;
  rarity: number;
  restoreTime: number;
  seedBase: number;
  seedColor: number;
  seedOverlay: number;
  seedOverlayColor: number;
  sitOverlayOffsetX: number;
  sitOverlayOffsetY: number;
  sitOverlayTexture: string;
  sitOverlayX: number;
  sitOverlayY: number;
  sitPlayerOffsetX: number;
  sitPlayerOffsetY: number;
  spreadType: number;
  texture: string;
  texture2: number;
  textureHash: number;
  textureX: number;
  textureY: number;
  treeBase: number;
  treeLeaves: number;
  unkValueShort1: number;
  unkValueShort2: number;
  val1: number;
  val2: number;
  value: number;
  value2: number;
}

export interface ItemsFile {
  items: ItemData[];
}

let globalItems: ItemsFile | null = null;

export async function getItems() {
  if (globalItems) return globalItems.items;

  let items: ItemsFile;

  try {
    const itemsFile = await fs.readFile("./data/items.json");
    items = JSON.parse(itemsFile.toString()) as unknown as ItemsFile;
  } catch {
    logger.info("No items.json file, downloading latest from github.");

    const { data } = await axios.get<ItemsFile>(
      "https://github.com/mar4ello6/itemsInfoBuilder/releases/download/latest/items.json",
      {
        responseType: "json",
      }
    );

    await fs.writeFile("./data/items.json", JSON.stringify(data, null, 2));

    items = data;
  }

  globalItems = items;

  return items.items;
}

export async function getItemById(id: number) {
  const items = await getItems();

  const [item] = items.filter((i) => i.itemID === id);

  if (!item) {
    throw new Error(`Item not found: ${id}`);
  }

  return item;
}
