"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();
  return $(`
      <li id="${story.storyId}">
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username}</small>
        <button id="favorite">Favorite</button>
        <button id="delete">Delete</button>
      </li>
    `);
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  // Remembers the status of favorites
  getButtonStatus($allStoriesList);
  $allStoriesList.show();
}

/** Gets story from the add/submit form on the nav bar and adds it to the story list. */

async function submitStory(evt) {
  evt.preventDefault();

  // grab the add story data
  const author = $("#add-story-author").val();
  const title = $("#add-story-title").val();
  const url = $("#add-story-url").val();

  await storyList.addStory(currentUser, {
    title: `${title}`,
    author: `${author}`,
    url: `${url}`,
  });
  storyList = await StoryList.getStories();
  putStoriesOnPage();
  $("#add-story-author").val("");
  $("#add-story-title").val("");
  $("#add-story-url").val("");
  $submitForm.hide();
}
$submitForm.on("submit", submitStory);

/** When the favorites tab is clicked on the nav bar we want to only show list of
 * favorite stories
 */
let favoriteList;

async function getFavoriteStories() {
  const stories = [];
  for (const storyId of userFavorites) {
    try {
      const response = await axios.get(`${BASE_URL}/stories/${storyId}`);
      if (response && response.data && response.data.story) {
        stories.push(new Story(response.data.story));
      }
    } catch (err) {
      console.error(`Failed to fetch story with ID: ${storyId}`);
    }
  }
  favoriteList = new StoryList(stories);
  return favoriteList.stories;
}

async function putFavoritesOnPage() {
  console.debug("putFavoritesOnPage");
  $favoritesList.empty();
  await getFavoriteStories();
  // loop through all of our stories and generate HTML for them
  for (let story of favoriteList.stories) {
    const $story = generateStoryMarkup(story);
    $favoritesList.append($story);
  }
  // Remembers the status of favorites
  getButtonStatus($favoritesList);
}
