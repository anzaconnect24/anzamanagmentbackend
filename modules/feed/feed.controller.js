const { Op } = require("sequelize");
const { errorResponse, successResponse } = require("../../utils/responses");
const {
  FeedPost,
  FeedComment,
  FeedReaction,
  User,
  sequelize,
} = require("../../models");

// The live feed.
//
// One conversation for the whole platform: a startup, a mentor, an investor
// and the programme team all post into the same place and reply to each
// other. Newest first, because that is the only order a feed is ever read in.
//
// There is no visibility model on purpose. Everyone signed in sees every
// post, which is what makes it a community board rather than a mailbox.

// How much of the feed comes back at once. The page asks for more as it
// scrolls rather than pulling a year of conversation on first paint.
const PAGE_SIZE = 20;

// The comments shown under a post before "view all". Enough to see the
// conversation has a shape, few enough that the feed still scrolls.
const PREVIEW_COMMENTS = 3;

const shapePerson = (user) =>
  user
    ? {
        uuid: user.uuid,
        name: user.name,
        role: user.role,
        image: user.image || null,
      }
    : null;

const shapeComment = (row) => {
  const data = row.toJSON ? row.toJSON() : row;
  return {
    uuid: data.uuid,
    body: data.body,
    createdAt: data.createdAt,
    author: shapePerson(data.author),
  };
};

// Who may take a post or comment down: its author, or an administrator.
// Nobody else, however senior - a programme lead is not a moderator of the
// whole platform.
const mayRemove = (req, row) =>
  req.user.role === "Admin" || row.authorId === req.user.id;

const getFeed = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || PAGE_SIZE, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const where = { archivedAt: null };

    // One search box over what was said and who said it.
    const keyword = String(req.query.keyword || "").trim();

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { body: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { rows, count } = await FeedPost.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "author",
          attributes: ["uuid", "name", "role", "image"],
        },
      ],
      // id breaks the tie: two posts made in the same second are ordered by
      // which was actually written first, not by whatever the driver returns.
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
      distinct: true,
    });

    // Comments are fetched for this page of posts in one query rather than
    // one per post - a feed of twenty posts should not be twenty-one reads.
    const postIds = rows.map((row) => row.id);

    const comments = postIds.length
      ? await FeedComment.findAll({
          where: { postId: { [Op.in]: postIds }, archivedAt: null },
          include: [
            {
              model: User,
              as: "author",
              attributes: ["uuid", "name", "role", "image"],
            },
          ],
          order: [
            ["createdAt", "ASC"],
            ["id", "ASC"],
          ],
        })
      : [];

    const byPost = new Map();

    for (const comment of comments) {
      const list = byPost.get(comment.postId) || [];
      list.push(comment);
      byPost.set(comment.postId, list);
    }

    // Reactions for this page, in one read for the same reason as the
    // comments: a feed of twenty posts is one query, not twenty.
    const reactions = postIds.length
      ? await FeedReaction.findAll({
          where: { postId: { [Op.in]: postIds } },
          attributes: ["postId", "userId", "value"],
          raw: true,
        })
      : [];

    const tally = new Map();

    for (const reaction of reactions) {
      const row = tally.get(reaction.postId) || { likes: 0, dislikes: 0, mine: 0 };

      if (reaction.value > 0) row.likes += 1;
      else row.dislikes += 1;

      // Which way this reader went, so the page can light the right button
      // without a second call.
      if (reaction.userId === req.user.id) row.mine = reaction.value;

      tally.set(reaction.postId, row);
    }

    const data = rows.map((row) => {
      const post = row.toJSON();
      const all = byPost.get(row.id) || [];
      const mood = tally.get(row.id) || { likes: 0, dislikes: 0, mine: 0 };

      return {
        likes: mood.likes,
        dislikes: mood.dislikes,
        myReaction: mood.mine,
        uuid: post.uuid,
        title: post.title,
        body: post.body,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        author: shapePerson(post.author),
        // Whether this reader may take it down, answered here so the page
        // never has to work out the rule for itself.
        canRemove: mayRemove(req, row),
        commentCount: all.length,
        // The newest few, in reading order.
        comments: all.slice(-PREVIEW_COMMENTS).map(shapeComment),
        // Who is in the conversation, for the row of faces under a post.
        commenters: [
          ...new Map(
            all
              .filter((comment) => comment.author)
              .map((comment) => [
                comment.author.uuid,
                shapePerson(comment.author),
              ]),
          ).values(),
        ],
      };
    });

    successResponse(res, {
      count,
      offset,
      limit,
      hasMore: offset + rows.length < count,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createPost = async (req, res) => {
  try {
    const body = String(req.body.body || "").trim();

    if (!body) {
      return res
        .status(400)
        .json({ status: false, message: "Write something to post" });
    }

    const post = await FeedPost.create({
      authorId: req.user.id,
      title: String(req.body.title || "").trim() || null,
      body,
      imageUrl: req.file ? `/files/${req.file.filename}` : null,
    });

    const saved = await FeedPost.findOne({
      where: { id: post.id },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["uuid", "name", "role", "image"],
        },
      ],
    });

    const shaped = saved.toJSON();

    successResponse(res, {
      uuid: shaped.uuid,
      title: shaped.title,
      body: shaped.body,
      imageUrl: shaped.imageUrl,
      createdAt: shaped.createdAt,
      author: shapePerson(shaped.author),
      canRemove: true,
      commentCount: 0,
      comments: [],
      commenters: [],
      likes: 0,
      dislikes: 0,
      myReaction: 0,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const removePost = async (req, res) => {
  try {
    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    if (!mayRemove(req, post)) {
      return res
        .status(403)
        .json({ status: false, message: "This is not your post" });
    }

    await post.update({ archivedAt: new Date() });
    successResponse(res, { uuid: post.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Like, dislike, or take it back.
//
// One handler for all three, because they are one act: the reader is saying
// what they now think of the post, and what they thought before is replaced.
// Sending the same value again clears it, which is what tapping a lit button
// means everywhere else.
const reactToPost = async (req, res) => {
  try {
    const wanted = Number(req.body.value);

    if (![1, -1, 0].includes(wanted)) {
      return res.status(400).json({
        status: false,
        message: "A reaction is 1 to like, -1 to dislike, or 0 to take it back",
      });
    }

    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    const existing = await FeedReaction.findOne({
      where: { postId: post.id, userId: req.user.id },
    });

    if (wanted === 0 || (existing && existing.value === wanted)) {
      if (existing) await existing.destroy();
    } else if (existing) {
      await existing.update({ value: wanted });
    } else {
      await FeedReaction.create({
        postId: post.id,
        userId: req.user.id,
        value: wanted,
      });
    }

    // Counted from the rows rather than adjusted in the client's head, so
    // two people reacting at once still leaves the numbers true.
    const rows = await FeedReaction.findAll({
      where: { postId: post.id },
      attributes: ["userId", "value"],
      raw: true,
    });

    successResponse(res, {
      uuid: post.uuid,
      likes: rows.filter((row) => row.value > 0).length,
      dislikes: rows.filter((row) => row.value < 0).length,
      myReaction:
        rows.find((row) => row.userId === req.user.id)?.value || 0,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Every comment on one post, for when the preview under it is not enough.
const getComments = async (req, res) => {
  try {
    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    const rows = await FeedComment.findAll({
      where: { postId: post.id, archivedAt: null },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["uuid", "name", "role", "image"],
        },
      ],
      order: [
        ["createdAt", "ASC"],
        ["id", "ASC"],
      ],
    });

    successResponse(res, {
      count: rows.length,
      data: rows.map((row) => ({
        ...shapeComment(row),
        canRemove: mayRemove(req, row),
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createComment = async (req, res) => {
  try {
    const body = String(req.body.body || "").trim();

    if (!body) {
      return res
        .status(400)
        .json({ status: false, message: "Write something to reply" });
    }

    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    const comment = await FeedComment.create({
      postId: post.id,
      authorId: req.user.id,
      body,
    });

    const saved = await FeedComment.findOne({
      where: { id: comment.id },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["uuid", "name", "role", "image"],
        },
      ],
    });

    successResponse(res, { ...shapeComment(saved), canRemove: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

const removeComment = async (req, res) => {
  try {
    const comment = await FeedComment.findOne({
      where: { uuid: req.params.commentUuid, archivedAt: null },
    });

    if (!comment) {
      return res
        .status(404)
        .json({ status: false, message: "Comment not found" });
    }

    if (!mayRemove(req, comment)) {
      return res
        .status(403)
        .json({ status: false, message: "This is not your comment" });
    }

    await comment.update({ archivedAt: new Date() });
    successResponse(res, { uuid: comment.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Who else is here. Feeds the faces beside the feed, and answers "how big is
// this community?" without a second screen.
const getFeedMembers = async (req, res) => {
  try {
    const count = await User.count({ where: { activated: true } });

    const recent = await User.findAll({
      where: { activated: true },
      attributes: ["uuid", "name", "role", "image"],
      order: [["createdAt", "DESC"]],
      limit: 8,
    });

    // Who is talking, counted over the posts and comments themselves.
    const [voices] = await sequelize.query(
      `SELECT u.uuid, u.name, u.role, u.image, COUNT(*) AS posts
         FROM feed_posts p
         JOIN Users u ON u.id = p.authorId
        WHERE p.archivedAt IS NULL
        GROUP BY u.uuid, u.name, u.role, u.image
        ORDER BY posts DESC
        LIMIT 5`,
    );

    successResponse(res, {
      members: count,
      recent: recent.map((row) => shapePerson(row.toJSON())),
      mostActive: voices.map((row) => ({
        ...shapePerson(row),
        posts: Number(row.posts),
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getFeed,
  createPost,
  removePost,
  reactToPost,
  getComments,
  createComment,
  removeComment,
  getFeedMembers,
};
