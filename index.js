import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";


const app = express();
const port = 3000;
const password = "abcd1234"
const isLoggedIn = false;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "myLibrary",
  password: "sid@POSTGRESPSWRD8521",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// async function getBookData(bookId) {
//    try {
//       const bookId = req.body.bookId;
//       const result = await db.query(`SELECT *
//       FROM books 
//       JOIN book_reviews
//       ON books.id = book_reviews.book_id
//       JOIN book_notes 
//       ON books.id = book_notes.book_id
//       WHERE id = ${bookId}
//       ORDER BY id ASC`);
//       return result.rows;
//    } catch (error) {
//       console.log(error);
//    }
// }

// SELECT * FROM books
//             JOIN book_reviews ON books.id=book_reviews.book_id
//             ORDER BY ${sort} ASC
app.get("/", async (req, res) => {
   const result = await db.query("SELECT * FROM books JOIN book_reviews ON books.id=book_reviews.book_id ORDER BY id ASC;");
   const books = result.rows;
   res.render("index.ejs",{
      books: books
   });
}).post("/", (req, res) => {
   res.redirect("/");
});

app.post("/login", async (req, res) => {
   if(req.body["password"] === password){
      const result = await db.query("SELECT * FROM books JOIN book_reviews ON books.id=book_reviews.book_id ORDER BY id ASC;");
   const books = result.rows;
      res.render("admin.ejs",{
         books: books
      });
   } else {
      res.redirect("/");
   }
});

app.post("/book", async(req, res) => {
   try {
      const bookId = req.body.bookId;
      const result = await db.query(`SELECT *
      FROM books 
      JOIN book_reviews
      ON books.id = book_reviews.book_id
      JOIN book_notes 
      ON books.id = book_notes.book_id
      WHERE id = ${bookId}
      ORDER BY id ASC`);
      res.render("editbook.ejs", {
         book: result.rows
      });
   } catch (error) {
      console.log(error);
   }
   
});

app.get("/notes/:id", async(req, res) => {
   try {
      const bookId = req.params.id;
      const result = await db.query(`SELECT *
      FROM books 
      JOIN book_reviews
      ON books.id = book_reviews.book_id
      JOIN book_notes 
      ON books.id = book_notes.book_id
      WHERE id = ${bookId}
      ORDER BY id ASC`);
      res.render("notes.ejs", {
         book: result.rows[0]
      });
   } catch (error) {
      console.log(error);
   }
})

app.post("/updateBook", async(req, res) => {
   const bookId = parseInt(req.body.bookId);
   const bookTitle = req.body.title;
   const coverId = req.body.cover_id;
   const author = req.body.author;
   const review = req.body.review;
   const rating = req.body.rating;
   const book_notes = req.body.book_notes;
   try {
       // Begin a transaction
       await db.query('BEGIN');

       // Update the book title, author, and cover_id
       await db.query(
           `UPDATE books 
           SET title = $1, author = $2, cover_id = $3
           WHERE id = $4`, [bookTitle, author, coverId, bookId]
       );

       // Update the book review and rating
       await db.query(
           `UPDATE book_reviews 
           SET review_text = $1, rating = $2
           WHERE book_id = $3`, [review, rating, bookId]
       );

       // Update the book notes
       await db.query(
           `UPDATE book_notes 
           SET book_notes = $1
           WHERE book_id = $2`, [book_notes, bookId]
       );

       // Commit the transaction if all updates are successful
       await db.query('COMMIT');

       res.redirect("/");

   } catch (error) {
       // Rollback the transaction if an error occurs
       await db.query('ROLLBACK');
       console.log("An Error Occured: ", error);
       // Handle the error appropriately
   }
});


app.post("/addBook", async(req, res) => {
   const bookTitle = req.body.title;
    const coverId = req.body.cover_id;
    const author = req.body.author;
    const review = req.body.review;
    const rating = req.body.rating;
    try {
      // Begin a transaction
      await db.query('BEGIN');
      const newBook = await db.query(
          `INSERT INTO books (title, author, cover_id)
          VALUES ($1, $2, $3)
          RETURNING id`, [bookTitle, author, coverId]
      );
      const newReview = await db.query(
          `INSERT INTO book_reviews (book_id, review_text, rating)
          VALUES ($1, $2, $3)
          RETURNING *`, [newBook.rows[0].id, review, rating]
      );
      const newNotes = await db.query(
        `INSERT INTO book_notes (book_id)
        VALUES ($1)
        RETURNING *`, [newBook.rows[0].id] 
      );
      // Commit the transaction if both inserts are successful
      await db.query('COMMIT');

      res.redirect("/");

  } catch (error) {
      // Rollback the transaction if an error occurs
      await db.query('ROLLBACK');
      console.log("An Error Occured: ", error);
  }
});

app.delete("/delete/:id", async(req, res) => {
   const bookid = req.params.id;
   try {
      await db.query('BEGIN');
      await db.query(`DELETE FROM book_notes WHERE book_id = $1`, [bookid]);
      await db.query(`DELETE FROM book_reviews WHERE book_id = $1`, [bookid]);
      await db.query(`DELETE FROM books WHERE id = $1`, [bookid]);
      await db.query('COMMIT');
   } catch (error) {
      await db.query('ROLLBACK');
      console.log(error);
   }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });