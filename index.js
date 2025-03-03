const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");
const Fuse = require("fuse.js");
const axios = require("axios");
const { Readable } = require("stream");

const app = express();
const PORT = process.env.PORT || 3000;

// Cargar datos desde el CSV
let articles = [];

async function cargarCSV() {
  try {
    const response = await axios.get("https://raw.githubusercontent.com/Marioyahuar/PanaceaGetArticles/refs/heads/main/archivoFinal.csv"); 
    console.log("DATA: ", response.data.length)
    // Convertir el string en un stream
    const stream = Readable.from(response.data);

    stream
      .pipe(csv({ separator: ';', headers: ['Autor', 'Titulo', 'Archivo', 'Volumen', 'Seccion', 'URL', 'Ano'] }))
      .on("data", (row) => articles.push(row))
      .on("end", () => console.log("CSV cargado correctamente"));
      
  } catch (error) {
    console.error("Error cargando el CSV:", error);
  }
}

cargarCSV();

// Configuración de Fuse.js para búsqueda flexible
const fuseOptions = {
  keys: ["Autor"],
  threshold: 0.2, // Permite cierta flexibilidad en la búsqueda
  findAllMatches: true,
  ignoreLocation: true,
  includeScore: true,
};

app.get("/articles", (req, res) => {
  const authorQuery = req.query.author;
  if (!authorQuery) {
    return res.status(400).json({ error: 'Se requiere el parámetro "author"' });
  }

  const fuse = new Fuse(articles, fuseOptions);
  const results = fuse.search(authorQuery);

  if (results.length === 0) {
    return res
      .status(404)
      .json({ message: "No se encontraron artículos para ese autor" });
  }

  // Extraer y devolver solo los datos relevantes
  const filteredArticles = results.map(({ item }) => ({
    Autor: item.Autor,
    Artículo: item.Titulo,
    Volumen: item.Volumen,
    URL: item.URL,
    Seccion: item.Seccion,
    Anho: item.Anho
  }));

  res.json({ author: authorQuery, count: filteredArticles.length, articles: filteredArticles });
});

app.listen(PORT, () =>
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
);