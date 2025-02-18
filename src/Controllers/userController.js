const ConnectionRequest = require("../models/ConnectionRequest");
const User = require("../models/User");

// const USER_SAFE_DATA = "firstName lastName photoUrl accountStatus averageRating ticketsSold isVerified";
// const USER_SAFE_DATA = "firstName lastName photoUrl accountStatus isVerified buyerStats.totalTicketsBought";

// exports.getRequests = async (req, res) => {
//     try {
//         const loggedInUser = req.user;
       
//         const connRequest = await ConnectionRequest.find({
//             toUserId: loggedInUser._id,
//             status: "interested"
//         })
//         .populate("fromUserId", USER_SAFE_DATA)
//         .populate("ticketId", "eventName eventDate price");

//         if (!connRequest.length) {
//             return res.status(200).json({
//                 message: "No pending requests found",
//                 data: []
//             });
//         }

//         res.status(200).json({
//             message: "Data fetched Successfully",
//             data: connRequest
//         });
//     } catch (err) {
//         console.error('Get requests error:', err);
//         res.status(500).json({
//             error: "Failed to fetch requests",
//             message: err.message
//         });
//     }
// };

// exports.getconnections = async (req, res) => {
//     try {
//         const loggedInUser = req.user;
        
//         const connectionRequests = await ConnectionRequest.find({
//             $or: [
//                 { toUserId: loggedInUser._id, status: "accepted" },
//                 { fromUserId: loggedInUser._id, status: "accepted" }
//             ]
//         })
//         .populate("fromUserId", USER_SAFE_DATA)
//         .populate("toUserId", USER_SAFE_DATA)
//         .populate("ticketId", "eventName eventDate price");

//         const data = connectionRequests.map((row) => {
//             return row.fromUserId._id.toString() === loggedInUser._id.toString()
//                 ? row.toUserId
//                 : row.fromUserId;
//         });

//         res.status(200).json({
//             message: "Connections fetched successfully",
//             data
//         });
//     } catch (err) {
//         console.error('Get connections error:', err);
//         res.status(500).json({
//             error: "Failed to fetch connections",
//             message: err.message
//         });
//     }
// };
const USER_SAFE_DATA_BUYER = "firstName lastName photoUrl accountStatus isVerified buyerStats.totalTicketsBought";
const USER_SAFE_DATA_SELLER = "firstName lastName photoUrl accountStatus isVerified sellerStats.ticketsSold";

exports.getRequests = async (req, res) => {
    try {
        const loggedInUser = req.user;

        // Validate seller role
        if (loggedInUser.role !== "seller") {
            return res.status(403).json({
                message: "Only sellers can view connection requests"
            });
        }

        // Get pending requests for seller's tickets
        const requests = await ConnectionRequest.find({
            toUserId: loggedInUser._id,
            status: "interested"
        })
        .populate({
            path: "fromUserId",
            select: USER_SAFE_DATA_BUYER
        })
        .populate("ticketId", "eventName eventDate price venue")
        .sort({ createdAt: -1 });  // Newest first

        // Format response
        const formattedRequests = requests.map(request => ({
            requestId: request._id,
            buyer: request.fromUserId,
            ticket: request.ticketId,
            requestedAt: request.createdAt
        }));

        res.status(200).json({
            message: "Requests fetched successfully",
            data: formattedRequests.length > 0 ? formattedRequests : []
        });

    } catch (err) {
        console.error("Get requests error:", err);
        res.status(500).json({
            error: "Failed to fetch requests",
            message: err.message
        });
    }
};

exports.getconnections = async (req, res) => {
    try {
        const loggedInUser = req.user;
        
        // Get all connections for the logged-in user with any status
        const connectionRequests = await ConnectionRequest.find({
            $or: [
                { 
                    toUserId: loggedInUser._id,
                    status: { 
                        $in: ["interested", "accepted", "pending_archive", "archived"] 
                    }
                },
                { 
                    fromUserId: loggedInUser._id,
                    status: { 
                        $in: ["interested", "accepted", "pending_archive", "archived"] 
                    }
                }
            ]
        })
        .populate({
            path: "fromUserId",
            select: loggedInUser.role === "seller" ? USER_SAFE_DATA_BUYER : USER_SAFE_DATA_SELLER
        })
        .populate({
            path: "toUserId",
            select: loggedInUser.role === "seller" ? USER_SAFE_DATA_BUYER : USER_SAFE_DATA_SELLER
        })
        .populate("ticketId", "eventName eventDate price")
        .sort({ updatedAt: -1 }); // Sort by most recent first

        // Extract relevant connection details
        const data = connectionRequests.map((request) => {
            const connectionData = {
                _id: request._id,
                status: request.status,
                connectedAt: request.updatedAt,
                ticket: request.ticketId,
            };

            // For sellers: show buyer details
            if (loggedInUser.role === "seller") {
                connectionData.user = request.fromUserId;
                connectionData.isSeller = true;
            }
            // For buyers: show seller details
            else {
                connectionData.user = request.toUserId;
                connectionData.isSeller = false;
            }

            return connectionData;
        });

        res.status(200).json({
            success: true,
            message: "Connections fetched successfully",
            data
        });
    } catch (err) {
        console.error('Get connections error:', err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch connections",
            message: err.message
        });
    }
};

// exports.getfeed = async (req, res) => {
//     try {
//         let { page = 1, limit = 10 } = req.query;
//         const loggedInUser = req.user;

//         // Validate pagination params
//         limit = Math.min(parseInt(limit), 50);
//         page = Math.max(parseInt(page), 1);
//         const skip = (page - 1) * limit;

//         // Get all connections
//         const connectionRequests = await ConnectionRequest.find({
//             $or: [
//                 { fromUserId: loggedInUser._id },
//                 { toUserId: loggedInUser._id }
//             ]
//         }).select("fromUserId toUserId");

//         // Create set of users to exclude
//         const hideUsersFromFeed = new Set();
//         connectionRequests.forEach((req) => {
//             hideUsersFromFeed.add(req.fromUserId.toString());
//             hideUsersFromFeed.add(req.toUserId.toString());
//         });
//         hideUsersFromFeed.add(loggedInUser._id.toString());

//         // Find users for feed
//         const users = await User.find({
//             _id: { $nin: Array.from(hideUsersFromFeed) }
//         })
//         .select(USER_SAFE_DATA)
//         .sort({ averageRating: -1 })
//         .skip(skip)
//         .limit(limit);

//         const total = await User.countDocuments({
//             _id: { $nin: Array.from(hideUsersFromFeed) }
//         });

//         res.status(200).json({
//             message: "Feed fetched successfully",
//             data: users,
//             pagination: {
//                 currentPage: page,
//                 totalPages: Math.ceil(total / limit),
//                 totalItems: total,
//                 hasNextPage: skip + users.length < total,
//                 hasPrevPage: page > 1
//             }
//         });
//     } catch (err) {
//         console.error('Get feed error:', err);
//         res.status(500).json({
//             error: "Failed to fetch feed",
//             message: err.message
//         });
//     }
// };