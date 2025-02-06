const fs = require("fs-extra");
const { exec } = require("child_process");

//Config
const addFillers = true;
const addHeaders = true;
const style = "trench_bible"
const inputMD = "FR_Trench+Crusade+Rules+v1.6.md";//"Trench+Crusade+Rules+v1.6.md"

async function convertMarkdownToHTML() {
  try {
    // Lire le contenu du fichier texte
    const texte = await processMarkdown();
    // Convertir le texte en HTML simple (titres et paragraphes)
    let contenuHTML = getMarkdownToHTML(texte);

    // Charger le modèle HTML et insérer le contenu
    let template = fs.readFileSync("template.html", "utf-8");
    template = template
      .replace("{{CONTENT}}", contenuHTML)
      .replace("{{STYLE}}", "styles/" + style + "/style.css");


    // Sauvegarder le fichier HTML final
    fs.writeFileSync("livre.html", template, "utf-8");

    // Exécuter PrinceXML pour générer le PDF
    exec("prince livre.html -o output.pdf", (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur : ${error.message}`);
        return;
      }
      console.log("✅ Livre généré : output.pdf");
    });
  } catch (err) {
    console.error("❌ Erreur lors du traitement :", err);
  }
}

function getMarkdownToHTML(texte) {
  let markdownText = cleanMarkdown(texte);

  let htmlText = convertToHtml(markdownText);//cleanLinesAndAddNumbering(htmlText);
  return htmlText;
}

function cleanMarkdown(markdownText) {
  let cleanText = markdownText
    .replace(/!image\(.*?\)\{.*?\}/gs, "")//Remove Images
  //cleanText = fixBrokenLines(cleanText);

  fs.writeFileSync("cleanMarkDown.md", cleanText, "utf-8");
  return cleanText;
}

function convertToHtml(markdownText) {
  let htmlText = addTitles(markdownText);
  htmlText = formatText(htmlText);
  htmlText = formatTables(htmlText);
  htmlText = addNumbering(htmlText);
  htmlText = addLettrine(htmlText);
  htmlText = formatEquipmentLists(htmlText);
  htmlText = cleanHTML(htmlText);
  htmlText = addIllustrations(htmlText);
  return htmlText;
}


function addIllustrations(htmlText) {
  //random Header
  if (addHeaders) {
    let headerIndex = 0;
    htmlText = htmlText.replace(/(<h3>)/g, (match, h3) => {
      headerIndex += 1;
      if (headerIndex > 10) return "<h3>";
      return "<img class='header' src='styles/" + style + "/headers/header" + headerIndex + ".svg' /><h3>";
    });
  }

  //random filler
  if (addFillers) {
    let fillerIndex = 0;
    htmlText = htmlText.replace(/<h4>/g, (match, h4) => {
      fillerIndex += 1;
      let content = "<h4>";
      if (fillerIndex / 2 == Math.round(fillerIndex / 2))
        content = "<img class='filler' src='styles/" + style + "/fillers/filler" + fillerIndex + ".svg' /><h4>";

      return content;
    });
  }

  return htmlText
}
function cleanHTML(htmlText) {
  return htmlText
    .replace(/<ol><li><li>/g, "<ol><li>")
    .replace(/<li>\.<\/li>/g, "")
    .replace(/(<[^>]+>)([^<\n]+)\n+\s+([^<\n]+)(<\/[^>]+>)/gm, "$1$2 $3$4");
}
function formatText(text) {
  let htmlText = text
    .replace(/\*\*(.*?\s*?\S*?)\*\*/gm, "<span class='emphaze'>$1</span>") // Gras 
    .replace(/\*(.*?\s*?\S*?)\*/gm, "<i>$1</i>")   // Italique
    .replace(/\*/gm, "");
  return htmlText;
}
function addTitles(text) {
  let htmlText = text
    .replace(/###### (.+)$/gm, "<h6>$1</h6>") // Titres de niveau 5
    .replace(/##### (.+)$/gm, "<h5>$1</h5>") // Titres de niveau 5
    .replace(/#### (.+)$/gm, "<h4>$1</h4>") // Titres de niveau 4
    .replace(/### (.+)$/gm, "<h3>$1</h3>") // Titres de niveau 3
    .replace(/## (.+)$/gm, "<div class='centeredPageContainer'><h2>$1</h2></div>")  // Titres de niveau 2
    .replace(/# (.+)$/gm, "<div class='centeredPageContainer'><h1>$1</h1></div>")   // Titres de niveau 1


  //Particular case for title, add style to small words
  htmlText = htmlText.replace(/(<h2>.*?<\/h2>)/g, (match, h2) => {
    h2 = h2
      .replace("The", "<span class='smallWordsTitle'>The</span><br>")
      .replace("of the", "<br><span class='smallWordsTitle'>of the</span><br>")
      .replace(" of a ", "<br><span class='smallWordsTitle'> of a </span><br>")
    return h2;
  });

  return htmlText;
}

function addNumbering(markdownText) {
  let htmlText = markdownText.replace("St. ", "St.");
  //placing Ol on text between two H3
  htmlText = htmlText.replace(/(<h3>.*?<\/h3>)([\s\S]*?)(?=<h3>|<div|$)/g, (match, h3, content) => {
    let section = `${h3}<ol>${content.trim()}</ol>`;
    section = section.replace(/<h4>Warband Variant:(.*)<\/h4>/g, `<h4 class='warbandvariant'>$1<\/h4>`);
    //specify models  
    if (htmlText.indexOf("Moribundi") < htmlText.indexOf(content)) {
      section = section
        .replace("<h3>", "<div class='centeredPageContainer'><h3>")
        .replace("</h3>", "</h3></div>")
        .replace(/<h5>(\d?-?\d?)(.*)(<span.*<\/span>)/gm, (match, ducats, model, span) => {
          let imgName = model.trim().replace(/\s/g, "_") + ".jpg";
          console.log(imgName);
          return `</ol><div class='centeredPageContainer'><img class="modelIllustration" src="illustrations/models/${imgName}" /></div><h5 class="model">${ducats}${model}${span}</h5><ol>`;
        });
    }

    return section;
  });

  //Encapsulation of each sentence in a Li except for titles
  htmlText = htmlText.replace(/(<ol>)([\s\S]*?)(<\/ol>)/g, (match, openOl, content, closeOl) => {

    let cleanedContent = content.replace(/([^\n])\n([^\n])/g, '$1 $2').trim();

    let transformedContentArray = [];
    let regexSplit = /<\/h\d>|\.\s|\!\s/;
    let regexTitle = /<h(\d)>/;
    let linesArray = cleanedContent.split(regexSplit);
    for (let i = 0; i < linesArray.length; i++) {
      let line = linesArray[i];
      if (regexTitle.test(line)) {
        line = line + "</h" + regexTitle.exec(line)[1] + ">";
      }
      else {
        line = "<li>" + line.trim().replace(/\n/, " ") + ".</li>"
      }

      transformedContentArray.push(line);
    }

    return `${openOl}${transformedContentArray.join("")}${closeOl}`;
  });

  htmlText = htmlText.replace("St.", "St. ");
  return htmlText;
}

function addLettrine(htmlText) {
  htmlText = htmlText.replace(/<ol>(<li>)(.*\n.*)(<\/li>)?/g, (match, openLi, firstLine, closeLi) => {
    if (firstLine.trim().indexOf(".</li>") == 0) {
      return `<ol><li>${firstLine.replace(".</li>", "")}</li>`;
    }
    return `<ol><p class='lettrine'>${firstLine.trim()}</p>`;
  });
  return htmlText;
}

function formatTables(text) {
  let regex = /(.*-{3,}[\s-]*\s*)((.*\n)+?)(.*-{3,}.*)/g;
  let table = text.replace(regex,
    (match, topBorder, globalContent, lastRow, bottomBorder) => {
      // Convertir les en-têtes du tableau
      let contentArray = globalContent.split("\n");
      let headers = globalContent.split("\n")[0].trim().split(/\s{2,}/).map(h => `<th style="display: block;">${h.replace(/\*\*(.*?)\*\*/g, '$1')}</th>`).join('');
      globalContent = globalContent.replace(globalContent.split("\n")[0], "");
      // Convertir les lignes du corps
      let rows = globalContent.trim().split("\n");
      let tables = "";
      for (let i = 0; i < rows.length; i++) {
        row = rows[i];
        let cells = row.trim().split(/\s{2,}/).map(cell => `<td style='display: block;'>${cell.replace(/\*(.*?)\*/g, '<em>$1</em>')}</td>`).join('');
        row = `<tr style='display: block; float: left;'>${cells.replace(/,/g, "<br>")}</tr>`;
        tables += `<br><table ><tbody><tr style='display: block; float: left;'>${headers}</tr>${row}</tbody></table>`;
      }

      return tables;
    });
  return table;
}

function formatEquipmentLists(htmlText) {
  htmlText = htmlText.replace(/<h5>(Ranged Weapons|Melee Weapons|Armour|Equipment)<\/h5>(.*?)(?=<h5>)/gis, (match, section, list) => {
    let listArray = list.split(/\n/);
    let listTable = [];
    for (let i = 0; i < listArray.length; i++) {
      listArray[i] = listArray[i]
        .replace("ducats", "ð")
        .replace("ducat", "ð")
        .replace("Glory Points", "GŁ")
        .replace("Glory Point", "GŁ");
      let equipment = listArray[i].replace(/(.+)\s(\d{1,2})\s(\ð|GŁ)(\s\(.*\))?/g,
        (match, name, value, currency, notes) => {
          if (notes == undefined) notes = "";
          else notes = notes.replace(/\(|\)/g, "").replace(", ", "<br>");
          return `<tr><td style="text-align:left">${name}</td><td style="text-align:right">${value}${currency}</td><td style="font-size:0.8em;text-align:right;">${notes}</td></tr>`;
        }
      );
      listTable.push(equipment.trim());
    }
    return `<h5>${section}</h5><table  style='width:100%;'><tbody>${listTable.join("")}</tbody></table><h5>`;
  });
  return htmlText;
}

async function processMarkdown() {
  return new Promise((resolve, reject) => {
    let markdownContent = "";

    // Lire le fichier en flux (stream)
    const stream = fs.createReadStream(inputMD, { encoding: "utf-8" });

    stream.on("data", chunk => {
      markdownContent += chunk; // Ajouter chaque morceau lu
    });

    stream.on("end", () => {
      console.log("✅ Lecture complète du fichier Markdown.");
      resolve(markdownContent);
    });

    stream.on("error", err => {
      console.error("❌ Erreur de lecture :", err);
      reject(err);
    });
  });
}

// Lancer la conversion
convertMarkdownToHTML();
