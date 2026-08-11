import { Sprite } from "./sprite.js";

/**
 * Composition!! (Basically, attaching parts :P)
 * ----------------------------------------------
 * So, when we have some sprites and joints. I wanted to be able
 * to stick them together but still have all the comfy scale controls.
 * So heres how my compositor works:
 * 
 * Firstly, attach some sprites
 *   composite = attachAt(body, head, "head", { scale: 1.2 })
 * 
 * (They have to have a joint in common) so, head or l_arm
 * 
 * Then we're going to scale the part around its attachment joint here
 * THEN we're going to bake the image into a NEW sprite, with all the joints
 * of the constituent sprites merged into the new one.
 * 
 * Once we do that, we can just pass down the train and call it an all
 * new sprite and use the normal scaling and sizing rules
 */

/**
 * Stick `part` onto `base` by aligning a shared joint name (e.g. "head").
 *
 * @param {Sprite} base
 * @param {Sprite} part
 * @param {string} jointName
 * @param {{ name?: string, scale?: number }} [opts]
 * @returns {Promise<Sprite>}
 */
export async function attachAt(base, part, jointName, opts = {}) {
  if (!base.hasJoint(jointName)) {
    throw new Error(`Base sprite "${base.name}" has no joint "${jointName}"`);
  }
  if (!part.hasJoint(jointName)) {
    throw new Error(`Part sprite "${part.name}" has no joint "${jointName}"`);
  }

  const scale = opts.scale ?? 1;
  if (!(typeof scale === "number" && scale > 0 && Number.isFinite(scale))) {
    throw new Error("attachAt(): scale must be a positive finite number");
  }

  const baseJoint = base.joint(jointName);
  const partJoint = part.joint(jointName);

  // Scale part around its attach joint (joint coords scale with the image)
  const scaledW = part.width * scale;
  const scaledH = part.height * scale;
  const scaledJointX = partJoint.x * scale;
  const scaledJointY = partJoint.y * scale;

  const partX = baseJoint.x - scaledJointX;
  const partY = baseJoint.y - scaledJointY;

  const minX = Math.min(0, partX);
  const minY = Math.min(0, partY);
  const maxX = Math.max(base.width, partX + scaledW);
  const maxY = Math.max(base.height, partY + scaledH);

  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);
  const baseOx = -minX;
  const baseOy = -minY;
  const partOx = partX - minX;
  const partOy = partY - minY;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2d context for compose");
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base.image, baseOx, baseOy);
  ctx.drawImage(part.image, partOx, partOy, scaledW, scaledH);

  /** @type {Record<string, { x: number, y: number }>} */
  const joints = {};
  for (const [name, { x, y }] of Object.entries(base.joints)) {
    joints[name] = { x: x + baseOx, y: y + baseOy };
  }
  // Part joints win on name clashes (attach joint lands on the same pixel either way)
  for (const [name, { x, y }] of Object.entries(part.joints)) {
    joints[name] = {
      x: x * scale + partOx,
      y: y * scale + partOy,
    };
  }

  const image = new Image();
  image.src = canvas.toDataURL("image/png");
  if (image.decode) {
    await image.decode();
  } else {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Failed to decode composed sprite"));
    });
  }

  return new Sprite({
    name: opts.name ?? `${base.name}+${part.name}`,
    image,
    joints,
  });
}
