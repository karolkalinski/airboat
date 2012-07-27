package codereview


import grails.test.mixin.Mock
import grails.test.mixin.TestFor
import spock.lang.Specification
import grails.converters.JSON
import spock.lang.Ignore

@TestFor(UserCommentController)
@Mock([Changeset, UserComment])
class UserCommentControllerSpec extends Specification {           //TODO implement tests!

    def "should return comments to changeset when given right changeset id"() {
        given:

        new Changeset("hash23", "agj", "zmiany", new Date())
            .addToUserComments(new UserComment(text: "fajno", author: "jil@touk.pl"))
            .save()

        when:
        params.id = "hash23"
        controller.returnCommentsToChangeset()

        then:
        response.json.size() == 1
        response.json[0].text == "fajno"

    }

    def "should return last comments, sorted by dateCreated, descending"() {
       given:
       def changeset = new Changeset("hash23", "agj", "zmiany", new Date())
       def comments = [new UserComment("Jil", "oooohhhh"),new UserComment("Troll", "oooohhhh?"), new UserComment("Jil", "No way!") ].each() {
           changeset.addToUserComments(it)
       }
       changeset.save()

       when:
       controller.getLastComments()
       String rendered = (response.contentAsString)

       then:
       comments.size() == JSON.parse(rendered).size()
       JSON.parse(rendered)[0].toString().contains('"id":3,"author":"Jil"')
       JSON.parse(rendered)[1].toString().contains('"id":2,"author":"Troll"')
       JSON.parse(rendered)[2].toString().contains('"id":1,"author":"Jil"')
    }


    def "should add comment correctly to db"() {
        given:
        def changeset = new Changeset("hash23", "agj", "zmiany", new Date()).save()
        String username = "troll"
        String text = "hey"
        String changesetId = "hash23"
        when:
        controller.addComment(username, text, changesetId)
        then:
        UserComment.findByText(text) != null
        UserComment.findByTextAndAuthor(text, username) != null
        UserComment.findByChangeset(changeset) != null
    }


}