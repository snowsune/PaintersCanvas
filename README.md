# Painter's Canvas

HAI!

For a long time I was REALLY struggling with more advanced composition on my [size-diff](https://size-diff.snowsune.net/) app (And other apps with similar needs)
and i was just getting fed up with js.. i ended up making mostly server-side rendering in python

BUT

No longer!

For Painter's Canvas is a new library I'm making, to offload all the js client-side work and make it happen!
With as best documentation as I can stomach <3

## Install

```shell
npm install git+https://github.com/snowsune/PaintersCanvas.git
```

## Use

```js
import { loadSprite, attachAt, createScaleCanvas } from "painters-canvas";

const body = await loadSprite("./body.json");
const head = await loadSprite("./head.json");
const sprite = await attachAt(body, head, "head", { scale: 1.2 }); // part scale around joint

const canvas = createScaleCanvas(document.getElementById("host"));
canvas.put(sprite, { heightInches: 72, measure: "top" });
```
