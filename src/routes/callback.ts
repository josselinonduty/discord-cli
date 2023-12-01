import { Router } from "express";

const callback = Router();

callback.get("/", (req, res) => {
    console.log(req.query.code);

    res.sendFile("callback.html", {
        root: "static",
    });
});

export default callback;
