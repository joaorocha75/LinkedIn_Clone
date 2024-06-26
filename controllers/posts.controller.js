const db = require('../models');
const User = db.users;
const Posts = db.posts;

exports.createPost = async (req, res) => {
    const { message } = req.body;
    const userId = req.loggedUserId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    if (!message) {
        return res.status(400).json({
            success: false,
            message: "Message is required"
        });
    }

    try {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(now.getDate() + 2); // Expira em 2 dias

        const newPost = new Posts({
            idUser: userId,
            message: message,
            date: now,
            expiresAt: expiresAt,
            likes: 0,
            comments: []
        });

        await newPost.save();

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.points += 10;
        await user.save();

        return res.status(201).json({
            success: true,
            message: "Post created successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Something went wrong. Please try again later"
        });
    }
};

exports.getPosts = async (req, res) => {
    try {
        // Paginação
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 10; 

        if (isNaN(page) || page < 0) {
            return res.status(400).json({
                success: false,
                message: "Page must be 0 or a positive integer"
            });
        }
        if (isNaN(limit) || limit !== 10) {
            return res.status(400).json({
                success: false,
                message: "Limit must be 10"
            });
        }

        const query = {};
        if (req.query.userId) {
            query.idUser = req.query.userId;
        }
        if (req.query.message) {
            query.message = { $regex: req.query.message, $options: "i" };
        }

        const totalPosts = await Posts.countDocuments(query);

        const posts = await Posts.find(query)
                                 .skip(page * limit)
                                 .limit(limit)
                                 .sort({ date: -1 }) // Ordenar por data (mais recente primeiro)
                                 .exec();

        const pagination = {
            total: totalPosts,
            pages: Math.ceil(totalPosts / limit),
            current: page + 1,
            limit: limit
        };

        const responseData = {
            pagination: pagination,
            data: posts.map(post => ({
                id: post._id,
                idUser: post.idUser,
                message: post.message,
                date: post.date,
                expiresAt: post.expiresAt,
                likes: post.likes,
                comments: post.comments
            }))
        };

        // Enviar resposta
        res.status(200).json(responseData);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.getPostById = async (req, res) => {
    try {
        const post = await Posts.findById(req.params.id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }
        res.status(200).json({
            success: true,
            post: post,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.deletePostById = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.loggedUserId;

        // Encontrar o post pelo ID
        const post = await Posts.findById(postId).exec();

        // Verificar se o post existe
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        if (post.idUser.toString() !== userId && req.loggedUserType !== "admin") {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this post"
            });
        }

        // Excluir o post
        const deletedPost = await Posts.findByIdAndDelete(postId).exec();

        // Verificar se o post foi excluído com sucesso
        if (!deletedPost) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Post deleted successfully"
        });
    } catch (err) {
        // Lidar com erros
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.commentPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { comment } = req.body;
        const userId = req.loggedUserId;

        if (!comment) {
            return res.status(400).json({
                success: false,
                message: "Comment is required"
            });
        }

        const post = await Posts.findById(postId).exec();

        // Verificar se o post existe
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // Criar o objeto do comentário
        const newComment = {
            userId: userId,
            comment: comment,
            date: new Date()
        };

        // Adicionar o comentário ao post
        post.comments.push(newComment);

        await post.save();

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.points += 10;
        await user.save();

        // Responder com sucesso
        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            comment: newComment
        });
    } catch (err) {
        // Lidar com erros
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.deleteComment = async (req, res) => {
    const postId = req.params.id;
    const commentId = req.params.commentId;

    try {
        // Encontrar o post
        const post = await Posts.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Encontrar o comentário
        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (req.loggedUserType !== 'admin' && comment.userId.toString() !== req.loggedUserId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Remover o comentário
        post.comments.pull(commentId);
        await post.save();
        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Something went wrong. Please try again later' });
    }
};

exports.likePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.loggedUserId;

    if(!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Encontrar o post
        const post = await Posts.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.likes += 1;
        await post.save();

        const user = await User.findById(userId);
        if(!user) {
            return res.status(404).json({
                sucess: false,
                message: "User not found"
            });
        }

        user.points += 10;
        await user.save();
        
        res.status(200).json({ message: 'Post liked successfully', likes: post.likes });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Something went wrong. Please try again later' });
    }
};

exports.dislikePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.loggedUserId;

    if(!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Encontrar o post
        const post = await Posts.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Verificar se o número de likes é maior que 0
        if (post.likes > 0) {
            // Decrementar o número de likes
            post.likes -= 1;
        } else {
            return res.status(400).json({ message: 'No likes to remove' });
        }

        // Salvar as alterações
        await post.save();

        res.status(200).json({ message: 'Post disliked successfully', likes: post.likes });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Something went wrong. Please try again later' });
    }
};


