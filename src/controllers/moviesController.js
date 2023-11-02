const path = require("path");
const db = require("../database/models");
const sequelize = db.sequelize;
const moment = require("moment");
const { Op } = require("sequelize");
const { error } = require("console");
const { move } = require("../routes/moviesRoutes");

//Aqui tienen una forma de llamar a cada uno de los modelos
// const {Movies,Genres,Actor} = require('../database/models');

//Aquí tienen otra forma de llamar a los modelos creados
const Movies = db.Movie;
const Genres = db.Genre;
const Actors = db.Actor;

const moviesController = {
  list: (req, res) => {
    db.Movie.findAll().then((movies) => {
      return res.render("moviesList.ejs", { movies });
    });
  },
  detail: (req, res) => {
    db.Movie.findByPk(req.params.id, {
      include: ["genre", "actors"],
    }).then((movie) => {
      return res.render("moviesDetail.ejs", { movie });
    });
  },
  new: (req, res) => {
    db.Movie.findAll({
      order: [["release_date", "DESC"]],
      limit: 5,
    }).then((movies) => {
      return res.render("newestMovies", { movies });
    });
  },
  recomended: (req, res) => {
    db.Movie.findAll({
      where: {
        rating: { [db.Sequelize.Op.gte]: 8 },
      },
      order: [["rating", "DESC"]],
    }).then((movies) => {
      res.render("recommendedMovies.ejs", { movies });
    });
  },
  //Aqui dispongo las rutas para trabajar con el CRUD
  add: function (req, res) {
    const allGenres = db.Genre.findAll({
      order: ["name"],
    });
    const actors = db.Actor.findAll({
      order: [["first_name"], ["last_name"]],
    });
    Promise.all([allGenres, actors])
      .then(([allGenres, actors]) => {
        return res.render("moviesAdd", {
          allGenres,
          actors,
        });
      })
      .catch((error) => console.log(error));
  },
  create: function (req, res) {
    const { title, rating, awards, release_date, length, genre_id } = req.body;
    db.Movie.create({
      title: title.trim(),
      rating,
      awards,
      release_date,
      length,
      genre_id,
    })
      .then((movie) => {
        console.log(movie);
        return res.redirect("/movies");
      })
      .catch((error) => console.log(error));
  },
  edit: function (req, res) {
    const genres = db.Genre.findAll({
      order: ["name"],
    });

    const movie = db.Movie.findByPk(req.params.id, {
      include: ["actors"],
    });

    const actors = db.Actor.findAll({
      order: [["first_name"], ["last_name"]],
    });
    Promise.all([movie, genres, actors])
      .then(([movie, genres, actors]) => {
        return res.render("moviesEdit", {
          Movie: movie,
          moment,
          genres,
          actors,
        });
      })
      .catch((error) => console.log(error));
  },
  update: function (req, res) {
    let { title, rating, awards, release_date, length, genre_id, actors } =
      req.body;
    actors = typeof actors == "string" ? [actors] : actors;
    db.Movie.update(
      {
        title: title.trim(),
        rating,
        awards,
        release_date,
        length,
        genre_id,
      },
      {
        where: {
          id: req.params.id,
        },
      }
    )
      .then((reponse) => {
        console.log(reponse);
        db.Actor_Movie.destroy({
          where: {
            movie_id: req.params.id,
          },
        }).then(() => {
          if (actors) {
            const actorsDB = actors.map((actor) => {
              return {
                movie_id: req.params.id,
                actor_id: actor,
              };
            });
            db.Actor_Movie.bulkCreate(actorsDB, {
              validate: true,
            }).then((reponse) => {
              console.log(reponse);
              return res.redirect("/movies/detail/" + req.params.id);
            });
          } else {
            return res.redirect("/movies/detail/" + req.params.id);
          }
        });
      })
      .catch((error) => console.log(error));
  },
  delete: function (req, res) {
    db.Movie.findByPk(req.params.id)
      .then((movie) => {
        res.render("moviesDelete.ejs", { movie });
      })
      .catch((error) => console.log(error));
  },
  destroy: function (req, res) {
    db.Actor_Movie.destroy({
      where: { movie_id: req.params.id },
    })
      .then(() => {
        db.Actor.update(
          {
            favorite_movie_id: null,
          },
          {
            where: {
              favorite_movie_id: req.params.id,
            },
          }
        ).then(() => {
          db.Movie.destroy({
            where: { id: req.params.id },
          }).then(() => {
            return res.redirect("/movies");
          });
        });
      })
      .catch((error) =>
        console.log("Upss, hubo un error en la conexión", error)
      );
  },
};

module.exports = moviesController;
