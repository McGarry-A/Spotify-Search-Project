//blueprint for searching for a track
function TrackSearch(trackName, artistName, albumName, albumImageUrl, albumUri, trackUri, artistId){ 
    this.trackName = trackName,
    this.artistName = artistName,
    this.albumName = albumName,
    this.albumImageUrl = albumImageUrl,
    this.albumUri = albumUri,
    this.trackUri = trackUri,
    this.artistId = artistId
  }
  
function AlbumSearch(albumName, artistName, albumImageUrl, albumUri, artistId){ 
    this.albumName = albumName,
    this.artistName = artistName,
    this.albumImageUrl = albumImageUrl,
    this.albumUri = albumUri,
    this.artistId = artistId
  }
  
function ArtistSearch(artistName, artistId, artistImage) {
    this.artistName = artistName,
    this.artistId = artistId,
    this.artistImage = artistImage
  }
  
function ArtistTopTracks(trackName, albumName){
    this.trackName = trackName, 
    this.albumName = albumName
  }
  
function ArtistDetails(followers, genres, popularity, artistName, image, id){
    this.followers = followers,
    this.genres = genres,
    this.popularity = popularity,
    this.artistName = artistName, 
    this.image = image,
    this.id = id
  }

  module.exports = {
      TrackSearch,
      AlbumSearch,
      ArtistSearch,
      ArtistTopTracks,
      ArtistDetails
  }