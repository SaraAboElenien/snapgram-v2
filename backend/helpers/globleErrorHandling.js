export const asyncHandler = (handle) => {
    return (req, res, next) => {
        handle(req, res, next).catch((err) => {
            next(err)
        })
    }
}



export const globleErrorHandling = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    if (req.log) {
        if (statusCode >= 500) {
            req.log.error({ err }, 'Unhandled error');
        } else {
            req.log.warn({ err: err.message }, 'Request error');
        }
    }
    res.status(statusCode).json({ message: "error", err: err.message, requestId: req.id });
    next()
}