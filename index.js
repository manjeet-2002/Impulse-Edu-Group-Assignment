const express = require('express');
const _ = require('lodash');
const cron = require('node-cron');

const app = express();

app.use(express.urlencoded({extended:true}));
app.use(express.json());

app.get('/',(req,res)=>{
    res.json({message:"Hello World"});
});

//analysing the blogs data and caching the result
const analyse = _.memoize((blogs) => {

    const totalBlogs = blogs.length;
    const blogWithLongestTitle = _.maxBy(blogs, (item) => item.title.length);
    const blogsWithPrivacyInTitle = _.filter(blogs, (item) => item.title.toLowerCase().includes('privacy')); //case-insensitive search
    const numberOfblogsWithPrivacyInTitle = _.size(blogsWithPrivacyInTitle);

    //creating an array of unique titles
    const uniqueTitles = _.uniq(_.map(blogs, 'title'));

    return {totalBlogs, blogWithLongestTitle, numberOfblogsWithPrivacyInTitle, uniqueTitles}
});

//search the blogs with {query} in their title and caching the result
const searchQuery = _.memoize((query, blogs) => {
    return _.filter(blogs, (item) => item.title.toLowerCase().includes(query))
})

//clearing cache at midnight
cron.schedule('0 0 * * *', () => {
    analyse.cache.clear();
    searchQuery.cache.clear();
});

//blog-stats route
app.get('/api/blog-stats',async (req,res)=>{

    try{
        const result = await fetch("https://intent-kit-16.hasura.app/api/rest/blogs",{
            headers:{'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'}
        });

        //getting blogs out of the response
        const usableResponse = await result.json();
        const blogs = usableResponse.blogs;

        const data = analyse(blogs);      //analysing the data
        
        res.status(200).json(data);
    } 
    catch(error){
        console.log(error);
        res.status(500).json({err:"Server Error!"});
    }
});

//blog-search endpoint
app.get('/api/:query', async (req,res) => {

    const query = req.query.query.toLowerCase();   //getting the search query

    try{
        const result = await fetch("https://intent-kit-16.hasura.app/api/rest/blogs",{
            headers:{'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'}
        });

        const usableResponse = await result.json();
        const blogs = usableResponse.blogs;

        const blogsWithQueryInTitle = searchQuery(query, blogs);
        
        res.status(200).json({blogsWithQueryInTitle});
        
    } catch(error){
        console.log(error);
        res.status(500).json({err:"Server Error!"});
    }
});

app.listen(5000,()=>{
    console.log("listening on port 5000....");
});