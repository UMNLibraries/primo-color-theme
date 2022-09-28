# Primo Color Theme
Stand-alone CLI tool for generating a custom Primo VE CSS color theme.

_Note: this only works with **Primo VE**_

## Why would I want to use this?
Likely, this is only of interest to Primo VE sites that do not use [Primo Studio](https://github.com/ExLibrisGroup/Primo-Studio) or the [Primo Development Environment](https://github.com/ExLibrisGroup/primo-explore-devenv). Color theme generation is already included in those tools. 

## Installation
`npm install @umn-libraries/primo-color-theme`

## Usage
First, define your color theme in a `colors.json` file (see example below.) Then run the following command to generate a CSS file (replace `name-primo.exlibrisgroup.com` with your Primo VE server name):

`primo-color-theme --server name.primo.exlibrisgroup.com --file colors.json > color-theme.css`

### Colors JSON File
The JSON file should look something like this: 

```json
{
  "primary": "#53738C",
  "secondary" : "#A9CDD6",
  "backgroundColor" : "white",
  "links": "#3D6E94",
  "warning": "tomato",
  "positive": "#0f7d00",
  "negative": "gray",
  "notice": "#B84D00",
  "linkTitle": "#33FFFF",
  "citation": "tomato",
  "citationTitles": "rgb(68, 112, 123)",
  "personalization": "#7d1538" 
}
```

^ The default values are depicted there. You only need to define the values that you want to override. 

