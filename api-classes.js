const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

  // TODO: Note the presence of `static` keyword: this indicates that getStories
  // is **not** an instance method. Rather, it is a method that is called on the
  // class directly. Why doesn't it make sense for getStories to be an instance method?

  static async getStories() {

    try {
      // query the /stories endpoint (no auth required)
      const response = await axios.get(`${BASE_URL}/stories`);

      // turn the plain old story objects from the API into instances of the Story class
      const stories = response.data.stories.map(story => new Story(story));

      // build an instance of our own class using the new array of stories
      const storyList = new StoryList(stories);
      return storyList;

    } catch (error) {
      // TBD: throw a new error so error can be propagated to UI
      console.log("getStories() request failed with the following error: ", error);
    }

  }

  /**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

  async addStory(user, newStory) {
    // TODO - Implement this functions!
    // this function should return the newly created story so it can be used in
    // the script.js file where it will be appended to the DOM
    try {
      const response = await axios({
        method: "POST",
        url: `${BASE_URL}/stories`,
        data: {
          // request body
          // this is the format specified by the API
          token: user.loginToken,
          story: newStory,
        }
      });
      // const res = await axios.post(`${BASE_URL}/stories`, 
      //   `{
      //     "token"     : "${user.loginToken}",
      //     "story":      { 
      //         "author"  : "${newStory.author}",
      //         "title"   : "${newStory.title}",
      //         "url"     : "${newStory.url}"
      //     }
      //   }`
      // );

      
      // Make a Story instance out of the story object we get back from API
      newStory = new Story(response.data.story);
      // add the story to the beggining of the stories list
      this.stories.unshift(newStory);
      // add the story to the beginning of the user's list
      user.ownStories.unshift(newStory);
      return newStory;

    } catch (error) {
      // TBD: throw a new error so error can be propagated to UI
      console.log("Error encountered when submitting a story. See error details: ", error)
    }
  }

  async deleteStory(user, storyId) {
    console.log("In deleteStory method");
    try {
        await axios({
        url: `${BASE_URL}/stories/${storyId}`,
        method: "DELETE",
        data: {
          token: user.loginToken
        },
      });
      // Mentor:  using this format gave me a 401 return code. What is wrong with it?
      // await axios.delete(`${BASE_URL}/stories/${storyId}`, 
      //   {
      //     "token" : this.loginToken
      //   }
      // );

      // filter out the story whose ID we are removing
      this.stories = this.stories.filter(story => story.storyId !== storyId);

      // do the same thing for the user's list of stories
      user.ownStories = user.ownStories.filter(story => story.storyId !== storyId);

      // do the same thing for the user's favorite list of stories
      // Note: the following statement was left out of Springboard's solution and it created the following bug:
      // 
      user.favorites = user.favorites.filter(story => story.storyId !== storyId);

      return user;

    } catch (error) {
      // TBD: throw a new error so error can be propagated to UI
      console.log('Error occurred deleting a story. See error: ', error);
    }

  }
}



/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    try {
      const response = await axios.post(`${BASE_URL}/signup`, {
        user: {
          username,
          password,
          name
        }
      });
  
      // build a new User instance from the API response
      const newUser = new User(response.data.user);
  
      // attach the token to the newUser instance for convenience
      newUser.loginToken = response.data.token;
  
      return newUser;
      
    } catch (error) {
      // TBD: throw a new error so error can be propagated to UI
      console.log("Create account request failed with the following error: ", error);
    }

  }

  /* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {

    try {
      const response = await axios.post(`${BASE_URL}/login`, {
        user: {
          username,
          password
        }
      });
  
      // build a new User instance from the API response
      const existingUser = new User(response.data.user);
  
      // instantiate Story instances for the user's favorites and ownStories
      existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
      existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
  
      // attach the token to the newUser instance for convenience
      existingUser.loginToken = response.data.token;
  
      return existingUser;

    } catch (error) {
      // TBD: throw a new error so error can be propagated to UI
      console.log("Create account request failed with the following error: ", error);

    }

  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    try {
      // call the API
      const response = await axios.get(`${BASE_URL}/users/${username}`, {
        params: {
          token
        }
      });
      // instantiate the user from the API information
      const existingUser = new User(response.data.user);

      // attach the token to the newUser instance for convenience
      existingUser.loginToken = token;

      // instantiate Story instances for the user's favorites and ownStories
      existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
      existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
      return existingUser;

    } catch (error) {
      // TBD: throw a new error so error can be propagated to UI
      console.log("getLoggedInUser request failed with the following error: ", error);
    }
  }

  /** Update local User's data structures
   * 
   */

  async updateLocalUserInfo() {

    try {
      const response = await axios.get(`${BASE_URL}/users/${this.username}`,
      {
        params: {
          token: this.loginToken
        }
      });
      this.name = response.data.user.name;
      this.createdAt = response.data.user.createdAt;
      this.updatedAt = response.data.user.updatedAt;
  
      // remember to conver the user's favorites and ownStories
      // into instances of Story
      this.favorites = response.data.user.favorites.map(s => new Story(s));
      this.ownStories = response.data.user.stories.map(s => new Story(s));
      
    } catch (error) {

      // TBD: throw a new error so error can be propagated to UI
      console.log("updateLocalUserInfo() request failed with the following error: ", error);
    }


  }

  async addFavorite(storyId) {
    try {
 
      const response = await axios.post(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, 
        {
          "token" : this.loginToken
        }
      );

     // Don't see why updateLocalUserInfo() call below is needed if you use "response" from /favorites api call above
     // to update local user record converting the user's favorites and own stories into instances of Story via:
     // this.favorites = response.data.user.favorites.map(s => new Story(s));
     // this.ownStories = response.data.user.stories.map(s => new Story(s));
     await this.updateLocalUserInfo();
     return this;
    } catch (error) {
      // TBD: throw a new error so error can be propagated to UI
      console.log('Error occurred adding a new favorite. See error: ', error)
    }
  }

  async removeFavorite(storyId) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
        method: 'DELETE',
        data: {
          token: this.loginToken
        }
      });
      // Don't see why updateLocalUserInfo() call below is needed if you use "response" from /favorites api call above
      // to update local user record converting the user's favorites and own stories into instances of Story via:
      // this.favorites = response.data.user.favorites.map(s => new Story(s));
      // this.ownStories = response.data.user.stories.map(s => new Story(s));
      await this.updateLocalUserInfo();
      return this;

      // Mentor Not sure why the following wouldn't work. Got 401 Not authorized.
      //  I tried a number of ways of doing this using this format, with ${}, without ${}, with "" this this.loginToken without, etc.
      // await axios.delete(`${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      //   `{
      //     "token" : "${this.loginToken}"
      //   }`
      // );
    } catch (error) {
      // TBD: throw a new error so error can be propagated to UI
      console.log('Error occurred removing a favorite. See error: ', error);
    }
  }

}
/**
 * Class to represent a single story.
 */

class Story {

  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}