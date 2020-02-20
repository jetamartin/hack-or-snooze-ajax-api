$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navSubmit = $("#nav-submit");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  const $mainNavLink = $('.main-nav-links')
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navFavorites = $('#nav-favorites');
  const $navMyStories = $('#nav-my-stories');
  const $favoritedArticlesList = $('#favorited-articles');
  const $userProfile = $('#user-profile');
 

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /** Show User Profile 
   *   When the user clicks their login name it will display the user's profile  
   *   info in lieu of any stories area of the UI
   */

  $navUserProfile.on("click", function() {
    // hide everything
    hideElements();
    // except the user profile
    $userProfile.show();
  });

 
   /** Display New stories form
   *   - Display the form that users will need to complete to add a new story
   */

  $navSubmit.on("click", function() {
    if (currentUser) {
      hideElements();
      $allStoriesList.show();
      $submitForm.slideToggle();
    }
  });

  /**  Display favorited stories list
   *   - When the user clicks on the "Favorites" menu option in the Nav bar
   *      display only the favorited stories in the stories area of the UI
   */
  $navFavorites.on('click', function (evt){
    hideElements();
    if (currentUser) {
      displayFavoritesList();
      $favoritedArticlesList.show();
    }
  });

  /** Dispaly users own stories
   *  - When the user clicks on the "my stories" menu option on the nav bar it display 
   *    only the stories that were created by the logged in user. If no stories have
   *    been added by that user then a message will be dispplayed indicating that no 
   *    stories currently exist. 
   */

  $navMyStories.on('click', function (evt) {
    hideElements();
    if (currentUser) {
      displayMyArticlesList();
      $ownStories.show();
    }
  });

 
  /** Handle sumbit of the form to create a new story
   *  - Retrieve values from the form and call methods that will ultmately add the new story to the domain model
   *  - After form submission clear and hide the form from the UI
   *  - if the story was successfully created then build the HTML for the new story and append it to the UI
   *  
   **/
  $submitForm.on("submit", async function(evt) {
    evt.preventDefault();
    if (currentUser) {  //check if user is logged in
      // author title url
      const newStory = {
        author  : $('#author').val(),
        title   : $('#title').val(),
        url     : $('#url').val() 
      };

      try {
        const newStoryInstance = await storyList.addStory(currentUser, newStory);
        /**
         * Mentor: Should I use a try catch here instead of simply checking for to see if newStoryInstance was returned
         * If I use a try catch I could throw a new error and presume a try catch used here would catch it so that 
         * more specific precise error info could be returned and displayed to user. Or is there yet a better way to handle this
         **/ 
        // generate markup for the new story
        // Mentor: The solution guide includes the following line...don't think it's right
        // <li id="${storyObject.storyId}" class="id-${storyObject.storyId}">
        const $li = $(`
          <li id="${newStoryInstance.storyId}">
          <span class="star">
            <i class="far fa-star"></i>
          </span>
          <a class="article-link" href="${newStory.url}" target="a_blank">
            <strong>${newStory.title}</strong>
          </a>
          <small class="article-author">by ${newStory.author}</small>
          <small class="article-hostname">(${getHostName(newStory.url)})</small>
          <small class="article-username">posted by ${newStory.author}</small>
        </li>
        `);
        // Add the new story to the UI
        $allStoriesList.prepend($li);

        // hide the form and reset it
        $submitForm.slideUp("slow");
        $submitForm.trigger("reset");
      } catch (error) {

        // TBD create a user viewabe message in UI to indicate a user was not successfully added
        console.log("Failure occured creating the new story. Check the log for error messages re: failure")
      }

    } else {  // Nav menu to "submit" a new story shouldn't be available so we should never have this situation
      // TBD create a message in UI
      console.log("User must be logged in to submit story");
    }
  });


  /** Handle user login submit
   *  - Retrieve username and password from login form and issue a call to login the user
   *  
   **/

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    try {
      // call the login static method to build a user instance
      const userInstance = await User.login(username, password);
      // set the global user to the user instance
      currentUser = userInstance;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    } catch (error) {
      // TBD: Create an error message to be displayed in UI
      console.log("User login failed");
    }
  });

  /** Create a new account for user
   * .- Retrieve values from form
   *  - Call method to create a new account
   *  - if successful save user to local storage and close/reset the form and display all stories
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    try {

      // call the create method, which calls the API and then builds a new user instance
      const newUser = await User.create(username, password, name);
      // Mentor: Check for instance or use try catch and use thrown error from point of failure    
      currentUser = newUser;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();

    } catch (error) {
      // TBD: Create an error message to be displayed in UI
      console.log("Failure: User account could not be created");
    }
  });

  /** Log out user
   * - Clear local storage and reload page
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /** Display Login and Create Account forms
   *  - When user clicks "locgin/create user" nav bar option
   *  - Show login and create account forms\\
   *  - Hide the stories displayed on page
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });



  /** Favorite/un-favorite a story
   *  - if story is not already favorite then call method to favorite it and change UI empty star to solid star
   *  - if story is already favorite then call method to unfavorite it and change UI solid star to empty star
   */
  $(".articles-container").on('click', ".star", async function(evt) {
    const $starElem = $(evt.target);
    const $story = $starElem.closest("li"); 
    const storyId = $story.attr('id');

    if ($starElem.hasClass('far')) {  // Not favorited so add favorite
      try {

        await currentUser.addFavorite(storyId);
        $starElem.toggleClass('fas far'); // Change star to solid star (i.e.,fas)

      } catch (error) {

        // Note: error should be displayed in UI rather than console
        console.log("The following error occured while trying to favorite this article: ", error);
      }


    } else {  // Already favorited so remove favorite

      try {

        await currentUser.removeFavorite(storyId);
        $starElem.toggleClass('fas far'); // change solid star to star outline (i.e., far)

      } catch (error) {

        // Note: TBD create error message to be displayed in UI rather than console
        console.log("The following error occured while trying to unfavorite this article: ", error);

      }

    }
    
  });

  /** Event listener for User to delete their own stories
   * 
   */
  $ownStories.on('click', ".trash-can", async function(evt) {
    if (currentUser) {
      const trashElem = evt.target;
      const $story = $(evt.target.closest("li"));
      const storyId = $story.attr('id');

      try {

        currentUser = await storyList.deleteStory(currentUser, storyId);

        // re-generate the story list
        await generateStories();

        // hide everything
        hideElements();

        // ...except the story list
        $allStoriesList.show();
        
      } catch (error) {

        // Note: TBD create error message to be displayed in UI rather than console
        console.log("Error occured while deleting a story");
        
      }

    }
  });


  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    try {
      // if there is a token in localStorage, call User.getLoggedInUser
      //  to get an instance of User with the right details
      //  this is designed to run once, on page load
      currentUser = await User.getLoggedInUser(token, username);
      await generateStories();

      if (currentUser) {
        generateProfile();
        showNavForLoggedInUser();
      }
    } catch (error) {
        // Note: TBD create error message to be displayed in UI rather than console
        console.log("Error occured in API call from checkLoggedIn(), Error :", error);
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // get the user profile
    generateProfile();
  }

  /**
   * Build a user profile based on the global "user" instance
   */

  function generateProfile() {
    // show your name
    $("#profile-name").text(`Name: ${currentUser.name}`);
    // show your username
    $("#profile-username").text(`Username: ${currentUser.username}`);
    // format and display the account creation date
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    // set the navigation to list the username
    $navUserProfile.text(`${currentUser.username}`);
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    try {
      // get an instance of StoryList
      const storyListInstance = await StoryList.getStories();
      // update our global variable
      storyList = storyListInstance;
      // empty out that part of the page
      $allStoriesList.empty();

      // loop through all of our stories and generate HTML for them
      for (let story of storyList.stories) {
        const result = generateStoryHTML(story, false);
        $allStoriesList.append(result);
      }
    } catch (error) {
      // Note: TBD create error message to be displayed in UI rather than console
      console.log("Error occured in API call from checkLoggedIn(), Error :", error);
    }
  }

  
  /**
   * Determine if the story is a user's favorite
   * 
   */
   function storyIsFavorite(story) {
     if (currentUser) {
      let favoriteIds = currentUser.favorites.map(story => story.storyId); 
      return favoriteIds.includes(story.storyId);
     }
    }
  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);

    let trashCan = isOwnStory ? '<span class="trash-can"><i class="far fa-trash-alt"></i></span>' : "";

    // If it is a favorit then star type will be 
    let starType = "far fa-star";
    if (storyIsFavorite(story) ) {
      starType = "fas fa-star"
    }

    // render story markup
    const storyMarkup = $(`
       <li id="${story.storyId}">
       ${trashCan}
        <span class="star">
          <i class="${starType}"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $favoritedArticlesList,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $mainNavLink.show();
    $userProfile.hide();
    $navLogin.hide();
    $navWelcome.show();
    $navUserProfile.text(currentUser.username);
    $navLogOut.show();
  }

  function displayFavoritesList() {
    $favoritedArticlesList.empty();
    // if the user has no favorites
    if (currentUser.favorites.length === 0) {
      $favoritedArticlesList.append("<h5>No favorites added!</h5>");
    } else {  // the user has at least one favorite article
      // loop through all of favorite stories and generate HTML for them
      for (let story of currentUser.favorites) {
        const result = generateStoryHTML(story, false);
        $favoritedArticlesList.append(result);
      }
    }
  }

  function displayMyArticlesList() {
    $ownStories.empty();

    // if the user has no stories that they have posted
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      // for all of the user's posted stories
      for (let story of currentUser.ownStories) {
        // render each story in the list
        let res = generateStoryHTML(story, true);
        $ownStories.append(res);
      }
    }

    $ownStories.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
