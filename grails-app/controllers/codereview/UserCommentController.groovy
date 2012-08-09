package codereview

import grails.converters.JSON
import grails.plugins.springsecurity.Secured

import static com.google.common.base.Preconditions.checkArgument

class UserCommentController {

    def index() {
    }

    //TODO think which option is better: artificial or natural (compound!) keys for changesets
    @Secured("isAuthenticated()")
    def addComment(String changesetId, String text) {
        def changeset = Changeset.findByIdentifier(changesetId)
        checkArgument(changeset != null, "Unknown changeset: ${changesetId}")

        //FIXME make comment belongsTo User
        def comment = new UserComment(author: authenticatedUser, text: text)
        changeset.addToUserComments(comment)
        comment.save(failOnError: true)

        render comment as JSON
    }


    def returnCommentsToChangeset(String id) {
        def changeset = Changeset.findByIdentifier(id) //TODO check that only one query is executed, refactor otherwise
        def comments = UserComment.findAllByChangeset(changeset)
        def that = this
        def commentsProperties = comments.collect { UserComment userComment ->
            def jsonProperties = userComment.properties + [
                    belongsToCurrentUser: userComment.author == that.authenticatedUser,
                    author: userComment.author.username
            ]
            jsonProperties.keySet().retainAll('text', 'author', 'dateCreated', 'belongsToCurrentUser')
            jsonProperties
        }
        render commentsProperties as JSON
    }

}
