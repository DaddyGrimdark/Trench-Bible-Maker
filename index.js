const fs = require("fs-extra");
const { exec } = require("child_process");

const inputMD = "Trench+Crusade+Rules+v1.6.md"

async function convertMarkdownToHTML() {
  try {
    // Lire le contenu du fichier texte
    const texte = await processMarkdown();
    // Convertir le texte en HTML simple (titres et paragraphes)
    let contenuHTML = getMarkdownToHTML(texte);

    // Charger le modèle HTML et insérer le contenu
    let template = fs.readFileSync("template.html", "utf-8");
    template = template.replace("{{CONTENT}}", contenuHTML);

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
  let htmlText = texte
    .replace(/##### (.+)$/gm, "<h5>$1</h5>") // Titres de niveau 4
    .replace(/#### (.+)$/gm, "<h4>$1</h4>") // Titres de niveau 4
    .replace(/### (.+)$/gm, "<h3>$1</h3>") // Titres de niveau 3
    .replace(/## (.+)$/gm, "</ol></p><h2>$1</h2><p><ol>")  // Titres de niveau 2
    .replace(/# (.+)$/gm, "</ol></p><h1>$1</h1><p><ol>")   // Titres de niveau 1
    .replace(/{.underline}/g, "") //soulignement
    .replace(/!\[image\](.*?\s*?\S*?)}/gm, "")//images
    .replace(/\*\*(.*?\s*?\S*?)\*\*/gm, "<b>$1</b>") // Gras 
    .replace(/;/g, "- ") // Tirets 
    .replace(/\*(.*?\s*?\S*?)\*/gm, "<i>$1</i>")   // Italique
    //.replace(/(.*?\s*?\S*?)\.\s/g, "<li>$1. </li>")//Ajouter un retour à la ligne après les points
    //Cleaning
    //.replace(/St\.\<\/li>/gm, "St.")
    .replace(/\[|\]/gm, "") //crochets restants
    .replace(/\<p\>\s*?\<\/p\>/gm, "") //paragraphes vides
    .replace(/#|\*/gm, "") //Dièses et étoilesrestants
    .replace(/St\.\s/gm, "St.") //Prevent St. too be splited

  htmlText = cleanLinesAndAddNumbering(htmlText);
  htmlText = htmlText.replace(/St\./gm, "St. ");
  return htmlText;
}

function cleanLinesAndAddNumbering(htmlText) {
  const linesArray = htmlText.split(/\.\s/);
  let linesArrayOutput = [];
  for (let i = 1; i < linesArray.length; i++) {
    let line = linesArray[i];
    if (line != "" && line != "<p></p>") {
      line = line.replace(/\n|\r/gm, " ");

      if (line.match(/\<\/h.\>/)) {
        let regex = /\<h.\>.*?\s*?\S*?\<\/h.\>/;
        let title = "</ol>" + regex.exec(line)[0] + "<ol>";
        let titleArray = line.split(regex);
        console.log(titleArray);
        for (let j = 0; j < titleArray.length; j++) {
          if (titleArray != "") titleArray[j] = "<li>" + titleArray[j] + ".</li>";
        }

        linesArrayOutput.push(titleArray.join(title));
      } else {
        linesArrayOutput.push("<li>" + line + ".</li>");
      }
    }
  }
  let htmlTextOutput = linesArrayOutput.join("");
  htmlTextOutput = "<ol>" + htmlTextOutput + "</ol>";
  //Cleaning again
  htmlTextOutput = htmlTextOutput.replace("<p></p>", "");
  htmlTextOutput = htmlTextOutput.replace("<li> .</li>", "");
  return htmlTextOutput;
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
