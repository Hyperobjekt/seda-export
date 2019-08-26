# SEDA PDF Export

Execute a node.js script to export a PDF using provided JSON and handlebars template.

## Commands

To run the export script only:

```
npm run export
```

To set up a nodemon script to watch and update all js and scss files:

```
npm run dev
```

For additional details on the file locations assumed for input and output for the node export command, see package.json.


# Chart overlays

There are 9 chart images in this archive that represent the 3 key metrics ("avg", "grd", "coh") for the 3 available regions ("counties", "districts", and "schools").

- Counties / Districts use socioeconomic status ("ses") as the X axis
- Schools use % Free or reduced-price lunch program ("frl"))

Create a div overlay over the image and position any overlay dots within the overlay container.  The overlay container should have the following position style to ensure it matches up with the data area of the chart.

```css
.overlay {
  position: absolute;
  top: 12.820512820512821%;
  left: 2.359882005899705%;
  bottom: 14.102564102564103%;
  right: 14.159292%;
}
```

> Note: I have provided `chart_overlay.png` that has a green overlay indicating the data area of the chart.  Make sure the overlay div is the same size as the green highlighted area.  The data area is consistent between all charts.

To place a dot, calculate the % position of its x / y value within the following ranges:

```json
{
  "avg": {
    "counties": [ -4.5, 2.5 ],
    "districts": [ -4.5, 4.5 ],
    "schools": [ -8, 7 ]
  },
  "grd": {
    "counties": [ 0.4, 1.6 ],
    "districts": [ 0.4, 1.6 ],
    "schools": [ -0.2, 2.6 ],
  },
  "coh": {
    "counties": [ -0.5, 0.5 ],
    "districts": [ -0.5, 0.5 ],
    "schools": [-1, 1],
  },
  "ses": {
    "counties": [-4, 3],
    "districts": [ -5, 4 ],
  },
  "frl": {
    "schools": [ 0, 1 ],
  }
}
```

> Note: I will also provide the range in the JSON object that is sent to the function, but they are here for reference.
